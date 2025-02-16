-- Create function to update user profile with proper type casting
CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_status text,
  p_schema text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_role text;
  v_target_user_schema text;
BEGIN
  -- Get current user's role
  SELECT role::text INTO v_current_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Get target user's schema
  SELECT schema_name INTO v_target_user_schema
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check permissions
  IF v_current_user_role != 'admin' AND p_schema != v_target_user_schema THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You do not have permission to update users from other schemas'
    );
  END IF;

  -- Update profile in the appropriate schema
  EXECUTE format('
    UPDATE %I.profiles SET
      full_name = $1,
      role = $2::public.user_role,
      status = $3::public.user_status,
      updated_at = now()
    WHERE id = $4
  ', p_schema)
  USING p_full_name, p_role, p_status, p_user_id;

  -- If updating an admin user, sync changes to other schemas
  IF p_role = 'admin' THEN
    -- Sync to quimicinter schema
    UPDATE quimicinter.profiles SET
      full_name = p_full_name,
      role = p_role::public.user_role,
      status = p_status::public.user_status,
      updated_at = now()
    WHERE id = p_user_id;

    -- Sync to qalinkforce schema
    UPDATE qalinkforce.profiles SET
      full_name = p_full_name,
      role = p_role::public.user_role,
      status = p_status::public.user_status,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Profile updated successfully'
  );
END;
$$;