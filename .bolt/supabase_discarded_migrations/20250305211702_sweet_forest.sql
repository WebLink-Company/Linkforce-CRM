/*
  # Roll back recent schema changes

  1. Changes
    - Remove schema-specific profile handling
    - Restore original profile structure
    - Clean up functions and triggers safely with CASCADE
    - Reset RLS policies to original state

  2. Security
    - Restore basic RLS policies
    - Maintain data integrity
*/

-- First drop dependent triggers with CASCADE
DROP TRIGGER IF EXISTS validate_user_creation_trigger ON profiles CASCADE;
DROP TRIGGER IF EXISTS sync_admin_profiles ON profiles CASCADE;
DROP TRIGGER IF EXISTS validate_new_user ON auth.users CASCADE;

-- Now we can safely drop the functions
DROP FUNCTION IF EXISTS sync_profile_schemas() CASCADE;
DROP FUNCTION IF EXISTS validate_user_creation() CASCADE;

-- Reset profile creation trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Update the new profile with basic info
  NEW.email := v_email;
  NEW.created_at := now();
  NEW.updated_at := now();
  NEW.schema_name := 'public';

  RETURN NEW;
END;
$$;

-- Recreate the profile creation trigger
DROP TRIGGER IF EXISTS on_profile_created ON profiles CASCADE;
CREATE TRIGGER on_profile_created
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Reset RLS policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by users in same schema" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admins" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile in same schema" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- Create basic RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update all profiles to use public schema
UPDATE profiles 
SET schema_name = 'public',
    updated_at = now()
WHERE schema_name != 'public';

-- Create function to validate roles
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure role is lowercase
  NEW.role := lower(NEW.role);

  -- Validate role
  IF NEW.role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role
    USING HINT = 'Role must be one of: admin, manager, user';
  END IF;

  RETURN NEW;
END;
$$;

-- Add role validation trigger
CREATE TRIGGER validate_user_role_trigger
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_role();