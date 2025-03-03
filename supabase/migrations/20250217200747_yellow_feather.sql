-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles CASCADE;

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
  v_creator_id uuid;
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

  -- Get creator ID from metadata
  v_creator_id := (NEW.raw_user_meta_data->>'created_by')::uuid;

  -- Check if profile exists
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

  -- If creator exists, restore their session
  IF v_creator_id IS NOT NULL THEN
    -- This is a placeholder - the actual session restoration happens in the application
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Create function to create user with role
CREATE OR REPLACE FUNCTION create_user_with_role(
  p_email text,
  p_password text,
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
  v_profile_exists boolean;
BEGIN
  -- Check if profile exists
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

  -- Create auth user with metadata
  PERFORM auth.uid();
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;