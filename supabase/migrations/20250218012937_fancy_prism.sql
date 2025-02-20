-- Create types in quimicinter schema
CREATE SCHEMA IF NOT EXISTS quimicinter;
CREATE TYPE quimicinter.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE quimicinter.user_status AS ENUM ('active', 'inactive', 'pending');

-- Create types in qalinkforce schema
CREATE SCHEMA IF NOT EXISTS qalinkforce;
CREATE TYPE qalinkforce.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE qalinkforce.user_status AS ENUM ('active', 'inactive', 'pending');

-- Create handle_new_auth_user function in quimicinter schema
CREATE OR REPLACE FUNCTION quimicinter.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quimicinter
AS $$
DECLARE
  v_schema text;
  v_role text;
  v_profile_exists boolean;
BEGIN
  v_schema := 'quimicinter';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  SELECT EXISTS (
    SELECT 1 FROM quimicinter.profiles 
    WHERE id = NEW.id OR email = NEW.email
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    INSERT INTO quimicinter.profiles (
      id,
      email,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_role::quimicinter.user_role,
      'active',
      v_schema,
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create handle_new_auth_user function in qalinkforce schema
CREATE OR REPLACE FUNCTION qalinkforce.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = qalinkforce
AS $$
DECLARE
  v_schema text;
  v_role text;
  v_profile_exists boolean;
BEGIN
  v_schema := 'qalinkforce';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  SELECT EXISTS (
    SELECT 1 FROM qalinkforce.profiles 
    WHERE id = NEW.id OR email = NEW.email
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    INSERT INTO qalinkforce.profiles (
      id,
      email,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_role::qalinkforce.user_role,
      'active',
      v_schema,
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create validate_schema_access function in quimicinter schema
CREATE OR REPLACE FUNCTION quimicinter.validate_schema_access(
  p_user_id uuid,
  p_schema text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quimicinter
AS $$
DECLARE
  v_role text;
  v_user_schema text;
BEGIN
  SELECT 
    role::text,
    schema_name 
  INTO v_role, v_user_schema
  FROM quimicinter.profiles
  WHERE id = p_user_id;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  RETURN v_user_schema = COALESCE(p_schema, 'quimicinter');
END;
$$;

-- Create validate_schema_access function in qalinkforce schema
CREATE OR REPLACE FUNCTION qalinkforce.validate_schema_access(
  p_user_id uuid,
  p_schema text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = qalinkforce
AS $$
DECLARE
  v_role text;
  v_user_schema text;
BEGIN
  SELECT 
    role::text,
    schema_name 
  INTO v_role, v_user_schema
  FROM qalinkforce.profiles
  WHERE id = p_user_id;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  RETURN v_user_schema = COALESCE(p_schema, 'qalinkforce');
END;
$$;

-- Enable RLS on profiles tables
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quimicinter schema
DROP POLICY IF EXISTS "profiles_read_policy" ON quimicinter.profiles;
CREATE POLICY "profiles_read_policy"
  ON quimicinter.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON quimicinter.profiles;
CREATE POLICY "profiles_insert_policy"
  ON quimicinter.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_policy" ON quimicinter.profiles;
CREATE POLICY "profiles_update_policy"
  ON quimicinter.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM quimicinter.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create RLS policies for qalinkforce schema
DROP POLICY IF EXISTS "profiles_read_policy" ON qalinkforce.profiles;
CREATE POLICY "profiles_read_policy"
  ON qalinkforce.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON qalinkforce.profiles;
CREATE POLICY "profiles_insert_policy"
  ON qalinkforce.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_policy" ON qalinkforce.profiles;
CREATE POLICY "profiles_update_policy"
  ON qalinkforce.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM qalinkforce.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );