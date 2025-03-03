-- Drop trigger first to remove dependency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then drop the function
DROP FUNCTION IF EXISTS handle_new_auth_user();

-- Create improved function without schema-qualified types
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_role text;
  v_profile_exists boolean;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

  -- Get role from metadata or determine based on schema
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE schema_name = v_schema
      ) THEN 'admin'
      ELSE 'user'
    END
  );

  -- Create profile in appropriate schema
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
      $1,
      $2,
      $3,
      $4,
      ''active'',
      $5,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING
  ', v_schema)
  USING 
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_schema;

  -- If admin, create profiles in other schemas too
  IF v_role = 'admin' THEN
    -- Create in quimicinter
    IF v_schema != 'quimicinter' THEN
      INSERT INTO quimicinter.profiles (
        id, email, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'admin',
        'active',
        'quimicinter',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create in qalinkforce
    IF v_schema != 'qalinkforce' THEN
      INSERT INTO qalinkforce.profiles (
        id, email, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'admin',
        'active',
        'qalinkforce',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Create function to create user with role
CREATE OR REPLACE FUNCTION create_user_with_role(
  p_email text,
  p_full_name text,
  p_role text,
  p_schema text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists boolean;
BEGIN
  -- Check if profile exists in target schema
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

  -- Create profile with specified role
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
      $1,
      $2,
      $3,
      $4,
      ''active'',
      $5,
      now(),
      now()
    )', p_schema)
  USING 
    auth.uid(),
    p_email,
    p_full_name,
    p_role,
    p_schema;

  -- If creating admin, sync to other schemas
  IF p_role = 'admin' THEN
    -- Sync to quimicinter if not already there
    IF p_schema != 'quimicinter' THEN
      INSERT INTO quimicinter.profiles (
        id, email, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        auth.uid(),
        p_email,
        p_full_name,
        'admin',
        'active',
        'quimicinter',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Sync to qalinkforce if not already there
    IF p_schema != 'qalinkforce' THEN
      INSERT INTO qalinkforce.profiles (
        id, email, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        auth.uid(),
        p_email,
        p_full_name,
        'admin',
        'active',
        'qalinkforce',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'User created successfully'
  );
END;
$$;