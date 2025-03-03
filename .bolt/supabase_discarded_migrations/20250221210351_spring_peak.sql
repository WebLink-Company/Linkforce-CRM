-- Drop existing auth handling functions
DROP FUNCTION IF EXISTS handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS validate_schema_access(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS handle_auth_state_change() CASCADE;

-- Create improved schema validation function
CREATE OR REPLACE FUNCTION validate_schema_access(
  p_user_id uuid,
  p_schema text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_role text;
  v_profile_exists boolean;
BEGIN
  -- Get schema from parameter or request headers
  v_schema := COALESCE(
    p_schema,
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Check if user has a profile in the target schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I.profiles
      WHERE id = $1
    )', v_schema)
  INTO v_profile_exists
  USING p_user_id;

  -- If no profile exists, access denied
  IF NOT v_profile_exists THEN
    RETURN false;
  END IF;

  -- Get user's role from the target schema
  EXECUTE format('
    SELECT role::text
    FROM %I.profiles
    WHERE id = $1
  ', v_schema)
  INTO v_role
  USING p_user_id;

  -- Admins can access their assigned schemas
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Regular users can only access their assigned schema
  RETURN true;
END;
$$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION create_user_in_schema(
  p_email text,
  p_full_name text,
  p_role text,
  p_schema text,
  p_creator_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_role text;
  v_profile_exists boolean;
BEGIN
  -- Check if creator has admin rights in target schema
  EXECUTE format('
    SELECT role::text
    FROM %I.profiles
    WHERE id = $1
  ', p_schema)
  INTO v_creator_role
  USING p_creator_id;

  IF v_creator_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only admins can create users in this schema'
    );
  END IF;

  -- Check if user already exists in target schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I.profiles
      WHERE email = $1
    )', p_schema)
  INTO v_profile_exists
  USING p_email;

  IF v_profile_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already exists in this schema'
    );
  END IF;

  -- Create auth user if doesn't exist
  DECLARE
    v_user_id uuid;
    v_existing boolean;
  BEGIN
    -- Check if auth user exists
    SELECT id, true
    INTO v_user_id, v_existing
    FROM auth.users
    WHERE email = p_email;

    -- If user doesn't exist, create them
    IF NOT v_existing THEN
      INSERT INTO auth.users (
        email,
        raw_user_meta_data
      ) VALUES (
        p_email,
        jsonb_build_object(
          'full_name', p_full_name,
          'schema_name', p_schema,
          'role', p_role,
          'created_by', p_creator_id
        )
      )
      RETURNING id INTO v_user_id;
    END IF;

    -- Create profile in target schema
    EXECUTE format('
      INSERT INTO %I.profiles (
        id,
        email,
        full_name,
        role,
        status,
        schema_name,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4::user_role, ''active'', $5, now(), now()
      )', p_schema)
    USING 
      v_user_id,
      p_email,
      p_full_name,
      p_role,
      p_schema;

    RETURN json_build_object(
      'success', true,
      'user_id', v_user_id,
      'message', 'User created successfully'
    );
  END;
END;
$$;

-- Create function to validate login
CREATE OR REPLACE FUNCTION validate_login(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_has_access boolean;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

  -- Check if user has access to this schema
  SELECT validate_schema_access(user_id, v_schema) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN json_build_object(
      'success', false,
      'error', format('No tienes acceso al ambiente %s', v_schema)
    );
  END IF;

  -- Update last login
  EXECUTE format('
    UPDATE %I.profiles 
    SET 
      last_login = now(),
      updated_at = now()
    WHERE id = $1
  ', v_schema)
  USING user_id;

  RETURN json_build_object(
    'success', true,
    'schema', v_schema
  );
END;
$$;

-- Create function to get user's allowed schemas
CREATE OR REPLACE FUNCTION get_user_schemas(user_id uuid)
RETURNS TABLE (schema_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return all schemas where user has a profile
  RETURN QUERY
  SELECT DISTINCT p.schema_name
  FROM (
    SELECT schema_name FROM public.profiles WHERE id = user_id
    UNION ALL
    SELECT schema_name FROM quimicinter.profiles WHERE id = user_id
    UNION ALL
    SELECT schema_name FROM qalinkforce.profiles WHERE id = user_id
  ) p;
END;
$$;

-- Update RLS policies for profiles
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "profiles_read_policy" ON %I.profiles;
      DROP POLICY IF EXISTS "profiles_insert_policy" ON %I.profiles;
      DROP POLICY IF EXISTS "profiles_update_policy" ON %I.profiles;

      CREATE POLICY "profiles_read_policy"
        ON %I.profiles FOR SELECT
        TO authenticated
        USING (validate_schema_access(auth.uid(), %L));

      CREATE POLICY "profiles_insert_policy"
        ON %I.profiles FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM %I.profiles
            WHERE id = auth.uid()
            AND role = ''admin''
          )
        );

      CREATE POLICY "profiles_update_policy"
        ON %I.profiles FOR UPDATE
        TO authenticated
        USING (
          auth.uid() = id 
          OR EXISTS (
            SELECT 1 FROM %I.profiles
            WHERE id = auth.uid()
            AND role = ''admin''
          )
        );
    ', 
    schema_name, schema_name, schema_name,
    schema_name, schema_name,
    schema_name,
    schema_name,
    schema_name,
    schema_name);
  END LOOP;
END $$;