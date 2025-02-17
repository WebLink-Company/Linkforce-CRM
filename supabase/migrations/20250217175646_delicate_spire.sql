-- Drop existing auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_state_change ON auth.users;

-- Create improved function to handle new auth users
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_role text;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

  -- Determine role (admin for first user in schema)
  SELECT 
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE schema_name = v_schema
      ) THEN 'admin'
      ELSE 'user'
    END INTO v_role;

  -- Create profile in appropriate schema
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
      $1,
      $2,
      $3::user_role,
      ''active''::user_status,
      $4,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      updated_at = now()
    RETURNING id
  ', v_schema)
  USING 
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_schema;

  -- If admin, create profiles in other schemas too
  IF v_role = 'admin' THEN
    -- Create in quimicinter
    IF v_schema != 'quimicinter' THEN
      INSERT INTO quimicinter.profiles (
        id, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'admin'::user_role,
        'active'::user_status,
        'quimicinter',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create in qalinkforce
    IF v_schema != 'qalinkforce' THEN
      INSERT INTO qalinkforce.profiles (
        id, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'admin'::user_role,
        'active'::user_status,
        'qalinkforce',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create improved function to handle auth state changes
CREATE OR REPLACE FUNCTION handle_auth_state_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_has_access boolean;
  v_profile_exists boolean;
BEGIN
  -- Get current schema
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Check if profile exists in current schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I.profiles
      WHERE id = $1
    )', v_schema)
  INTO v_profile_exists
  USING NEW.id;

  -- If profile doesn't exist, create it
  IF NOT v_profile_exists THEN
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
        $1,
        $2,
        ''user''::user_role,
        ''active''::user_status,
        $3,
        now(),
        now()
      )
      ON CONFLICT (id) DO NOTHING
    ', v_schema)
    USING 
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_schema;
  END IF;

  -- Check if user has access to this schema
  SELECT validate_schema_access(NEW.id, v_schema) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied to schema %', v_schema;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

CREATE TRIGGER on_auth_state_change
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_state_change();

-- Update validate_schema_access function to be more permissive during signup
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
  v_is_signup boolean;
BEGIN
  -- Get schema from parameter or request headers
  v_schema := COALESCE(
    p_schema,
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Check if this is a signup request
  v_is_signup := current_setting('request.method', true) = 'POST' 
    AND current_setting('request.path', true) LIKE '%/auth/v1/signup%';

  -- During signup, allow access
  IF v_is_signup THEN
    RETURN true;
  END IF;
  
  -- Get user's role and schema
  WITH user_profile AS (
    SELECT role::text, schema_name
    FROM profiles
    WHERE id = p_user_id
    UNION ALL
    SELECT role::text, schema_name
    FROM quimicinter.profiles
    WHERE id = p_user_id
    UNION ALL
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