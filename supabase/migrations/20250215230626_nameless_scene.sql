-- Create function to delete user with proper schema checks
CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_current_user_role text;
  v_target_user_schema text;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Get current user's role
  SELECT role::text INTO v_current_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Get target user's schema
  SELECT schema_name INTO v_target_user_schema
  FROM profiles
  WHERE id = user_id;
  
  -- Check permissions
  IF v_current_user_role != 'admin' AND v_schema != v_target_user_schema THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You do not have permission to delete users from other schemas'
    );
  END IF;

  -- Delete user from auth.users (this will trigger cascade delete)
  DELETE FROM auth.users WHERE id = user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );
END;
$$;

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view profiles in their schema" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "New users can be created in current schema" ON profiles;

-- Create new policies
CREATE POLICY "Users can view profiles in their schema"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
    OR role::text = 'admin'
  );

CREATE POLICY "Users can update profiles in their schema"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    auth.uid() = id
    -- Admins can update any profile in their schema
    OR (
      role::text = 'admin'
      AND schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
    )
  )
  WITH CHECK (
    -- Users can update their own profile
    auth.uid() = id
    -- Admins can update any profile in their schema
    OR (
      role::text = 'admin'
      AND schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
    )
  );

CREATE POLICY "Users can delete profiles in their schema"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete any profile in their schema
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role::text = 'admin'
      )
      AND schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
    )
    -- Super admins can delete any profile
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role::text = 'admin'
      AND schema_name = 'public'
    )
  );