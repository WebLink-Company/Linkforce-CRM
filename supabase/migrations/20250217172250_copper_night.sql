-- Drop existing functions first
DROP FUNCTION IF EXISTS check_auth_user(text);
DROP FUNCTION IF EXISTS create_user_profile(uuid,text,text,text);
DROP FUNCTION IF EXISTS handle_new_user_creation(text,text,text,text);
DROP FUNCTION IF EXISTS get_user_schema(uuid);

-- Create function to check if user exists in auth
CREATE OR REPLACE FUNCTION check_auth_user(p_email text)
RETURNS TABLE (
  user_id uuid,
  user_exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as user_id,
    TRUE as user_exists
  FROM auth.users
  WHERE email = p_email;
END;
$$;

-- Create function to create user profile with proper schema handling
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_schema text
)
RETURNS TABLE (
  success boolean,
  error text,
  profile_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists boolean;
  v_profile_id uuid;
BEGIN
  -- Check if profile exists in target schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I.profiles
      WHERE id = $1
    )', p_schema)
  INTO v_profile_exists
  USING p_user_id;

  IF v_profile_exists THEN
    RETURN QUERY SELECT 
      FALSE as success,
      'Profile already exists in this schema'::text as error,
      NULL::uuid as profile_id;
    RETURN;
  END IF;

  -- Create profile in specified schema
  EXECUTE format('
    INSERT INTO %I.profiles (
      id,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3::user_role, ''active''::user_status, $4, now(), now()
    )
    RETURNING id
  ', p_schema)
  INTO v_profile_id
  USING p_user_id, p_full_name, p_role, p_schema;

  RETURN QUERY SELECT 
    TRUE as success,
    NULL::text as error,
    v_profile_id as profile_id;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    FALSE as success,
    SQLERRM as error,
    NULL::uuid as profile_id;
END;
$$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user_creation(
  p_email text,
  p_full_name text,
  p_role text,
  p_schema text
)
RETURNS TABLE (
  success boolean,
  error text,
  profile_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_check RECORD;
BEGIN
  -- Check if user exists in auth
  SELECT * INTO v_user_check
  FROM check_auth_user(p_email);

  -- Return error if user exists
  IF v_user_check.user_exists THEN
    RETURN QUERY SELECT 
      FALSE as success,
      'User already exists in auth system'::text as error,
      NULL::uuid as profile_id;
    RETURN;
  END IF;

  -- Create profile
  RETURN QUERY
  SELECT * FROM create_user_profile(
    v_user_check.user_id,
    p_full_name,
    p_role,
    p_schema
  );
END;
$$;

-- Create function to get user schema
CREATE OR REPLACE FUNCTION get_user_schema(p_user_id uuid)
RETURNS TABLE (
  schema_name text,
  found boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
BEGIN
  -- Try to get schema from public profiles first
  SELECT schema_name INTO v_schema
  FROM profiles
  WHERE id = p_user_id;

  -- If found in public, return it
  IF v_schema IS NOT NULL THEN
    RETURN QUERY SELECT v_schema, TRUE;
    RETURN;
  END IF;

  -- Check quimicinter
  SELECT schema_name INTO v_schema
  FROM quimicinter.profiles
  WHERE id = p_user_id;

  -- If found in quimicinter, return it
  IF v_schema IS NOT NULL THEN
    RETURN QUERY SELECT v_schema, TRUE;
    RETURN;
  END IF;

  -- Check qalinkforce
  SELECT schema_name INTO v_schema
  FROM qalinkforce.profiles
  WHERE id = p_user_id;

  -- If found in qalinkforce, return it
  IF v_schema IS NOT NULL THEN
    RETURN QUERY SELECT v_schema, TRUE;
    RETURN;
  END IF;

  -- If not found anywhere, return public with found = false
  RETURN QUERY SELECT 'public'::text, FALSE;
END;
$$;