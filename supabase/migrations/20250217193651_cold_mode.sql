-- Drop existing policies
DROP POLICY IF EXISTS "Users can view profiles in their schema" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "New users can be created in current schema" ON profiles;

-- Create new simplified policies
CREATE POLICY "Enable read access for all authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for owners and admins"
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

-- Create function to validate login access
CREATE OR REPLACE FUNCTION validate_login_access(
  user_id uuid,
  p_schema text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_user_schema text;
BEGIN
  -- Get user's role and schema
  SELECT role::text, schema_name INTO v_role, v_user_schema
  FROM profiles
  WHERE id = user_id;

  -- If no profile found, access denied
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Admins can access all schemas
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Regular users must match schema
  RETURN v_user_schema = p_schema;
END;
$$;