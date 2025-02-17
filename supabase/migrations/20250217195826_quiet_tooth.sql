-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop existing policies and functions
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_auth_user() CASCADE;

-- Create simplified policies
CREATE POLICY "profiles_read_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to handle new user creation
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
  -- Get schema from metadata or default to public
  v_schema := COALESCE(
    NEW.raw_user_meta_data->>'schema_name',
    'public'
  );

  -- Get role from metadata or default to user
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'user'
  );

  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.id
  ) INTO v_profile_exists;

  IF v_profile_exists THEN
    -- Update existing profile
    UPDATE profiles SET
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
      role = v_role::user_role,
      updated_at = now()
    WHERE id = NEW.id;
  ELSE
    -- Create new profile
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_role::user_role,
      'active',
      v_schema,
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

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
  v_role text;
  v_user_schema text;
BEGIN
  -- Get schema from parameter or default
  v_schema := COALESCE(p_schema, 'public');
  
  -- Get user's role and schema
  SELECT 
    role::text,
    schema_name 
  INTO v_role, v_user_schema
  FROM profiles
  WHERE id = p_user_id;

  -- If no profile found, access denied
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Admins can access all schemas
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Regular users must match schema
  RETURN v_user_schema = v_schema;
END;
$$;

-- Create function to create user with role
CREATE OR REPLACE FUNCTION create_user_with_role(
  p_email text,
  p_password text,
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
  v_user_id uuid;
  v_profile_exists boolean;
BEGIN
  -- Check if profile exists in target schema
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE email = p_email
  ) INTO v_profile_exists;

  IF v_profile_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already exists'
    );
  END IF;

  -- Create auth user
  v_user_id := auth.uid();
  
  -- Create profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    status,
    schema_name,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    p_role::user_role,
    'active',
    p_schema,
    now(),
    now()
  );

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;