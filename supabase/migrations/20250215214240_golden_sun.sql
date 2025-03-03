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

-- Create function to handle auth user creation
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger AS $$
DECLARE
  v_schema text;
  v_profile_exists boolean;
BEGIN
  -- Get schema from hostname in request headers or default to public
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) INTO v_profile_exists;
  
  -- Create profile if it doesn't exist
  IF NOT v_profile_exists THEN
    INSERT INTO public.profiles (
      id,
      full_name,
      schema_name,
      role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      v_schema,
      'user',
      NEW.created_at,
      NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

-- Create function to validate schema access
CREATE OR REPLACE FUNCTION validate_schema_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema text;
  v_role user_role;
  v_profile_exists boolean;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id
  ) INTO v_profile_exists;
  
  -- Return false if profile doesn't exist
  IF NOT v_profile_exists THEN
    RETURN false;
  END IF;
  
  -- Get user's role
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

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view profiles in their schema" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "New users can be created in current schema" ON profiles;

-- Create new policies
CREATE POLICY "Users can view profiles in their schema"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
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
    schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
    OR EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;