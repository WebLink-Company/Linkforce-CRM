-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop existing policies and functions
DROP POLICY IF EXISTS "Users can view profiles in their schema" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles CASCADE;
DROP POLICY IF EXISTS "New users can be created in current schema" ON profiles CASCADE;
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

  -- Create profile in appropriate schema
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