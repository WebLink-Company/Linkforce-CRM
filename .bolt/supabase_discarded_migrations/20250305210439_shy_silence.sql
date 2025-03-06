/*
  # Fix Schema-based Authentication

  1. Changes
    - Add schema_name column to profiles
    - Update profile validation functions
    - Add schema-specific policies

  2. Security
    - Maintain RLS during migration
    - Add schema validation to policies
*/

-- Add schema_name column if it doesn't exist
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

-- Update profile validation function
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

  -- Ensure schema_name is valid
  IF NEW.schema_name NOT IN ('public', 'quimicinter', 'qalinkforce') THEN
    RAISE EXCEPTION 'Invalid schema: %. Must be one of: public, quimicinter, qalinkforce', NEW.schema_name
    USING HINT = 'Check the schema_name value',
          ERRCODE = '22000';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update user creation function
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
  -- Validate schema
  IF p_schema NOT IN ('public', 'quimicinter', 'qalinkforce') THEN
    RAISE EXCEPTION 'Invalid schema: %. Must be one of: public, quimicinter, qalinkforce', p_schema
    USING HINT = 'Check the schema parameter',
          ERRCODE = '22000';
  END IF;

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

-- Update policies to include schema validation
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;

CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all profiles
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'::user_role
    ))
    OR
    -- Users can only view profiles in their schema
    (schema_name = (
      SELECT schema_name FROM profiles
      WHERE id = auth.uid()
    ))
  );

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
    AND schema_name = (
      SELECT schema_name FROM profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    id = auth.uid()
    AND schema_name = (
      SELECT schema_name FROM profiles
      WHERE id = auth.uid()
    )
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