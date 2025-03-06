-- Create function to safely delete users
CREATE OR REPLACE FUNCTION delete_user_safely(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_role text;
  v_target_user_role text;
  v_target_schema text;
  v_current_schema text;
BEGIN
  -- Get current user's role and schema
  SELECT role::text, schema_name INTO v_current_user_role, v_current_schema
  FROM profiles
  WHERE id = auth.uid();

  -- Get target user's role and schema
  SELECT role::text, schema_name INTO v_target_user_role, v_target_schema
  FROM profiles
  WHERE id = p_user_id;

  -- Check permissions
  IF v_current_user_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only admin users can delete users'
    );
  END IF;

  -- Don't allow deleting yourself
  IF auth.uid() = p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot delete your own account'
    );
  END IF;

  -- Delete profile from appropriate schema
  CASE v_target_schema
    WHEN 'public' THEN
      DELETE FROM profiles WHERE id = p_user_id;
    WHEN 'quimicinter' THEN
      DELETE FROM quimicinter.profiles WHERE id = p_user_id;
    WHEN 'qalinkforce' THEN
      DELETE FROM qalinkforce.profiles WHERE id = p_user_id;
  END CASE;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_safely TO authenticated;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  WITH user_roles AS (
    SELECT role::text FROM profiles WHERE id = p_user_id
    UNION ALL
    SELECT role::text FROM quimicinter.profiles WHERE id = p_user_id
    UNION ALL
    SELECT role::text FROM qalinkforce.profiles WHERE id = p_user_id
  )
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE role = 'admin'
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;