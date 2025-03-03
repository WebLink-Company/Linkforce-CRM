-- Create function to validate schema access
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
  v_user_role text;
  v_user_schema text;
BEGIN
  -- Get schema from parameter or request headers
  v_schema := COALESCE(
    p_schema,
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Get user's role and schema
  WITH user_profile AS (
    -- Try public schema
    SELECT role::text, schema_name
    FROM public.profiles
    WHERE id = p_user_id
    UNION ALL
    -- Try quimicinter schema
    SELECT role::text, schema_name
    FROM quimicinter.profiles
    WHERE id = p_user_id
    UNION ALL
    -- Try qalinkforce schema
    SELECT role::text, schema_name
    FROM qalinkforce.profiles
    WHERE id = p_user_id
  )
  SELECT role, schema_name INTO v_user_role, v_user_schema
  FROM user_profile
  LIMIT 1;
  
  -- If no profile found, access denied
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admins can access all schemas
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Regular users can only access their assigned schema
  RETURN v_user_schema = v_schema;
END;
$$;

-- Create function to get user's allowed schemas
CREATE OR REPLACE FUNCTION get_user_allowed_schemas(p_user_id uuid)
RETURNS TABLE (schema_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_schemas AS (
    -- Get schemas where user has a profile
    SELECT DISTINCT schema_name
    FROM (
      SELECT schema_name, role::text as role FROM public.profiles WHERE id = p_user_id
      UNION ALL
      SELECT schema_name, role::text as role FROM quimicinter.profiles WHERE id = p_user_id
      UNION ALL
      SELECT schema_name, role::text as role FROM qalinkforce.profiles WHERE id = p_user_id
    ) profiles
  )
  SELECT us.schema_name
  FROM user_schemas us
  WHERE EXISTS (
    SELECT 1
    FROM user_schemas
    WHERE role = 'admin'
  )
  OR us.schema_name IN (
    SELECT schema_name
    FROM user_schemas
  );
END;
$$;

-- Create function to handle auth state change
CREATE OR REPLACE FUNCTION handle_auth_state_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema text;
  v_has_access boolean;
BEGIN
  -- Get current schema
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Check if user has access to this schema
  SELECT validate_schema_access(NEW.id, v_schema) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied to schema %', v_schema;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auth state changes
DROP TRIGGER IF EXISTS on_auth_state_change ON auth.users;
CREATE TRIGGER on_auth_state_change
  AFTER INSERT OR UPDATE
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_state_change();

-- Update RLS policies for profiles table in each schema
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    -- Drop existing policies
    EXECUTE format('
      DROP POLICY IF EXISTS "Users can view profiles in their schema" ON %I.profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON %I.profiles;
      DROP POLICY IF EXISTS "New users can be created in current schema" ON %I.profiles;
    ', schema_name, schema_name, schema_name);
    
    -- Create new policies
    EXECUTE format('
      CREATE POLICY "Users can view profiles in their schema"
        ON %I.profiles FOR SELECT
        TO authenticated
        USING (
          validate_schema_access(auth.uid(), %L)
        );
      
      CREATE POLICY "Users can update own profile"
        ON %I.profiles FOR UPDATE
        TO authenticated
        USING (
          auth.uid() = id 
          AND validate_schema_access(auth.uid(), %L)
        )
        WITH CHECK (
          auth.uid() = id 
          AND validate_schema_access(auth.uid(), %L)
        );
      
      CREATE POLICY "New users can be created in current schema"
        ON %I.profiles FOR INSERT
        TO authenticated
        WITH CHECK (
          validate_schema_access(auth.uid(), %L)
          OR (
            auth.uid() = id 
            AND schema_name = %L
          )
        );
    ', 
    schema_name, schema_name,
    schema_name, schema_name, schema_name,
    schema_name, schema_name, schema_name);
  END LOOP;
END;
$$;

-- Create function to handle login
CREATE OR REPLACE FUNCTION handle_login(
  p_user_id uuid,
  p_schema text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema text;
  v_has_access boolean;
BEGIN
  -- Get schema
  v_schema := COALESCE(
    p_schema,
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Validate access
  SELECT validate_schema_access(p_user_id, v_schema) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Access denied to schema %s', v_schema)
    );
  END IF;
  
  -- Update last login
  EXECUTE format('
    UPDATE %I.profiles 
    SET last_login = now()
    WHERE id = $1
  ', v_schema)
  USING p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'schema', v_schema
  );
END;
$$;

-- Create function to initialize schema for new user
CREATE OR REPLACE FUNCTION initialize_user_schema(
  p_user_id uuid,
  p_full_name text,
  p_schema text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create profile in specified schema
  EXECUTE format('
    INSERT INTO %I.profiles (
      id,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, ''user''::user_role, ''active''::user_status, $3, now(), now()
    )
    ON CONFLICT (id) DO NOTHING
  ', p_schema)
  USING p_user_id, p_full_name, p_schema;
  
  RETURN json_build_object(
    'success', true,
    'schema', p_schema
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;