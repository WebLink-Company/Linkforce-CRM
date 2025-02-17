-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_auth_user();

-- Create simplified function to handle new auth users
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
  -- Get schema from metadata or headers
  v_schema := COALESCE(
    NEW.raw_user_meta_data->>'schema_name',
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

  -- Create profile in current schema
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
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = now()
  ', v_schema)
  USING 
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_schema;

  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Create function to validate login access
CREATE OR REPLACE FUNCTION validate_login_access(
  user_id uuid,
  p_schema text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_user_schema text;
BEGIN
  -- Get user's role and schema from current schema
  EXECUTE format('
    SELECT role::text, schema_name
    FROM %I.profiles
    WHERE id = $1
  ', p_schema)
  INTO v_role, v_user_schema
  USING user_id;

  -- If no profile found, access denied
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Admins can access all schemas
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Regular users must match schema
  RETURN v_user_schema = p_schema;
END;
$$;