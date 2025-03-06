/*
  # User Role Management Migration

  1. Changes
    - Create user_role enum type
    - Convert role column to use enum type
    - Update user management functions
    - Recreate policies with new role type

  2. Security
    - Drop and recreate policies across all schemas
    - Maintain RLS during migration
    - Preserve existing role data
*/

-- Create user_role type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop all policies across all schemas
DO $$ 
DECLARE 
  schemas RECORD;
  policies RECORD;
BEGIN
  -- Loop through relevant schemas
  FOR schemas IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('public', 'quimicinter', 'qalinkforce')) 
  LOOP
    -- Loop through policies in each schema
    FOR policies IN (
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = schemas.schema_name AND tablename = 'profiles'
    )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
        policies.policyname, 
        policies.schemaname, 
        policies.tablename
      );
    END LOOP;
  END LOOP;
END $$;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS create_new_user(text, text, text, text, text);
DROP FUNCTION IF EXISTS validate_user_role();
DROP TRIGGER IF EXISTS validate_user_role_trigger ON profiles;

-- Add temporary column and convert data
ALTER TABLE profiles ADD COLUMN role_new user_role;
UPDATE profiles SET role_new = role::text::user_role;
ALTER TABLE profiles DROP COLUMN role CASCADE;
ALTER TABLE profiles RENAME COLUMN role_new TO role;
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- Function to create new user with proper role handling
CREATE OR REPLACE FUNCTION create_new_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_schema text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role user_role;
BEGIN
  -- Validate role
  BEGIN
    v_role := p_role::user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid role: %. Must be one of: admin, manager, user', p_role
    USING HINT = 'Check the role parameter',
          ERRCODE = '22P02';
  END;

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
    created_at
  )
  VALUES (
    v_user_id,
    p_email,
    p_full_name,
    v_role,
    'active',
    p_schema,
    now()
  );

  -- Log user creation
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    changes,
    user_id
  )
  VALUES (
    'user',
    v_user_id,
    'create',
    jsonb_build_object(
      'email', p_email,
      'role', v_role,
      'schema', p_schema
    ),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'hint', 'User creation failed'
  );
END;
$$;

-- Function to validate user roles
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure role is valid
  IF NEW.role::text NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be one of: admin, manager, user', NEW.role
    USING HINT = 'Check the role value',
          ERRCODE = '22000';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create new trigger for role validation
CREATE TRIGGER validate_user_role_trigger
  BEFORE INSERT OR UPDATE OF role
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_role();

-- Recreate base policies
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Only admins can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY "Only admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'::user_role
    )
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON TYPE user_role TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_user(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_role() TO authenticated;