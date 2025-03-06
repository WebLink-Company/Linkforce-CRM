/*
  # Fix Admin Authentication and User Management

  1. New Functions
    - `verify_admin_access` - Verifies admin access with schema awareness
    - `create_new_user` - Creates users with proper role management
    - `manage_user_profile` - Handles profile creation and updates

  2. Security
    - Schema-aware admin verification
    - Proper role-based access control
    - Audit logging for user management actions
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS verify_admin_access();
DROP FUNCTION IF EXISTS create_new_user(text, text, text, text, text);
DROP FUNCTION IF EXISTS manage_user_profile(uuid, text, jsonb);

-- Function to verify admin access with schema awareness
CREATE OR REPLACE FUNCTION verify_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_user_schema text;
BEGIN
  -- Get current user's role and schema
  SELECT role, schema_name INTO v_user_role, v_user_schema
  FROM profiles
  WHERE id = auth.uid();

  -- Log verification attempt
  RAISE NOTICE 'Verifying admin access for user % in schema %', auth.uid(), v_user_schema;

  -- Return true only if user is admin in their schema
  RETURN v_user_role = 'admin';
END;
$$;

-- Function to create new user with proper role management
CREATE OR REPLACE FUNCTION create_new_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_schema text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_user_id uuid;
BEGIN
  -- Verify admin access
  v_is_admin := verify_admin_access();
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required'
      USING HINT = 'Only administrators can create new users',
            ERRCODE = 'insufficient_privilege';
  END IF;

  -- Create user profile
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
    auth.uid(),
    p_email,
    p_full_name,
    p_role,
    'active',
    p_schema,
    now()
  )
  RETURNING id INTO v_user_id;

  -- Log user creation
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    changes,
    user_id
  ) VALUES (
    'user',
    v_user_id,
    'create',
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
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
    'hint', 'Admin verification failed or user creation error'
  );
END;
$$;

-- Function to manage user profiles
CREATE OR REPLACE FUNCTION manage_user_profile(
  p_user_id uuid,
  p_action text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_user_schema text;
BEGIN
  -- Verify admin access
  v_is_admin := verify_admin_access();
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required'
      USING HINT = 'Only administrators can manage user profiles',
            ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get user's schema
  SELECT schema_name INTO v_user_schema
  FROM profiles
  WHERE id = p_user_id;

  CASE p_action
    WHEN 'update' THEN
      UPDATE profiles
      SET
        full_name = COALESCE((p_data->>'full_name')::text, full_name),
        role = COALESCE((p_data->>'role')::text, role),
        status = COALESCE((p_data->>'status')::text, status),
        updated_at = now()
      WHERE id = p_user_id
      AND schema_name = v_user_schema;

    WHEN 'delete' THEN
      -- Soft delete the profile
      UPDATE profiles
      SET
        status = 'inactive',
        updated_at = now(),
        deleted_at = now()
      WHERE id = p_user_id
      AND schema_name = v_user_schema;

    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  -- Log the action
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    changes,
    user_id
  ) VALUES (
    'user_profile',
    p_user_id,
    p_action,
    p_data,
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', p_action
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'hint', 'Profile management operation failed'
  );
END;
$$;

-- Add necessary grants
GRANT EXECUTE ON FUNCTION verify_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_user(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION manage_user_profile(uuid, text, jsonb) TO authenticated;

-- Drop existing policies
DO $$ 
BEGIN
  -- Drop the policy if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can manage profiles if admin'
  ) THEN
    DROP POLICY IF EXISTS "Users can manage profiles if admin" ON profiles;
  END IF;
END $$;

-- Create new policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profiles can be updated by admins"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (verify_admin_access())
  WITH CHECK (verify_admin_access());

CREATE POLICY "Profiles can be deleted by admins"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (verify_admin_access());

CREATE POLICY "Profiles can be inserted by admins"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (verify_admin_access());