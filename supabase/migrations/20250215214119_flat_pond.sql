-- Add schema_name column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'schema_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN schema_name text NOT NULL DEFAULT 'public';
  END IF;
END $$;

-- Drop existing role type if it exists
DROP TYPE IF EXISTS user_role CASCADE;

-- Create new role type
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');

-- Add role column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role user_role NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Update existing profiles with correct schema
UPDATE profiles 
SET schema_name = 'public'
WHERE schema_name = 'public';

-- Set initial admin
UPDATE profiles 
SET role = 'admin'
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE raw_user_meta_data->>'full_name' = 'Julio Veras'
);

-- Create or replace function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_schema text;
BEGIN
  -- Get schema from hostname in request headers
  v_schema := current_setting('request.headers', true)::json->>'x-schema-name';
  
  -- Default to public if not found
  IF v_schema IS NULL THEN
    v_schema := 'public';
  END IF;

  -- Set schema_name and role
  NEW.schema_name := v_schema;
  NEW.role := 'user';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update RLS policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;
DROP POLICY IF EXISTS "Enable update for service role" ON profiles;

-- Create new policies
CREATE POLICY "Users can view profiles in their schema"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    schema_name = current_setting('request.headers', true)::json->>'x-schema-name'
    OR role = 'admin'
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "New users can be created in current schema"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    schema_name = current_setting('request.headers', true)::json->>'x-schema-name'
    OR EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create function to validate schema access
CREATE OR REPLACE FUNCTION validate_schema_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema text;
  v_role user_role;
BEGIN
  -- Get schema from request headers
  v_schema := current_setting('request.headers', true)::json->>'x-schema-name';
  
  -- Get user's role and schema
  SELECT role INTO v_role
  FROM profiles
  WHERE id = user_id;
  
  -- Admins can access all schemas
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user belongs to current schema
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id 
    AND schema_name = v_schema
  );
END;
$$;