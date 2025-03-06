/*
  # Fix Schema Profile Handling

  1. Changes
    - Add unique constraint for (id, schema_name)
    - Fix schema_name column default
    - Add schema synchronization function
    - Update profile policies
    - Add validation triggers

  2. Security
    - Maintain RLS policies
    - Add schema-specific checks
*/

-- Add unique constraint for id and schema_name
ALTER TABLE profiles ADD CONSTRAINT profiles_id_schema_name_key UNIQUE (id, schema_name);

-- Fix schema_name column
ALTER TABLE profiles 
  ALTER COLUMN schema_name SET NOT NULL,
  ALTER COLUMN schema_name SET DEFAULT 'public';

-- Create schema synchronization function
CREATE OR REPLACE FUNCTION sync_profile_schemas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure admin users exist in all schemas
  IF NEW.role = 'admin' THEN
    -- Create duplicate profiles for admin in all schemas
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    )
    SELECT
      NEW.id,
      NEW.email,
      NEW.full_name,
      NEW.role,
      NEW.status,
      schema_name,
      NEW.created_at,
      NEW.updated_at
    FROM (
      SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce']) AS schema_name
    ) schemas
    WHERE schema_name != NEW.schema_name
    ON CONFLICT (id, schema_name) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN NEW;
END;
$$;

-- Create or replace the profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
  v_schema text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Set schema based on current setting or default to 'public'
  v_schema := coalesce(
    current_setting('app.tenant_schema', true),
    NEW.schema_name,
    'public'
  );

  -- Update the new profile
  NEW.email := v_email;
  NEW.schema_name := v_schema;
  NEW.created_at := now();
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

-- Recreate the profile creation trigger
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add schema sync trigger for admin updates
DROP TRIGGER IF EXISTS sync_admin_profiles ON profiles;
CREATE TRIGGER sync_admin_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION sync_profile_schemas();

-- Function to validate user creation
CREATE OR REPLACE FUNCTION validate_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure schema_name is valid
  IF NEW.schema_name NOT IN ('public', 'quimicinter', 'qalinkforce') THEN
    RAISE EXCEPTION 'Invalid schema_name: %', NEW.schema_name
    USING HINT = 'Schema must be one of: public, quimicinter, qalinkforce';
  END IF;

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

-- Add validation trigger
DROP TRIGGER IF EXISTS validate_user_creation_trigger ON profiles;
CREATE TRIGGER validate_user_creation_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_creation();

-- Update RLS policies
DROP POLICY IF EXISTS "Profiles are viewable by users in same schema" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admins" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile in same schema" ON profiles;

CREATE POLICY "Profiles are viewable by users in same schema"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    schema_name = coalesce(current_setting('app.tenant_schema', true), 'public')
    OR role = 'admin'
  );

CREATE POLICY "Profiles can be updated by admins"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile in same schema"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    AND schema_name = coalesce(current_setting('app.tenant_schema', true), 'public')
  )
  WITH CHECK (
    id = auth.uid()
    AND schema_name = coalesce(current_setting('app.tenant_schema', true), 'public')
  );

-- Create admin profiles in all schemas
DO $$
DECLARE
  admin_user RECORD;
  schema_name text;
BEGIN
  FOR admin_user IN (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.status,
      p.created_at,
      p.updated_at
    FROM profiles p
    WHERE p.role = 'admin'
  ) LOOP
    FOR schema_name IN (SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])) LOOP
      BEGIN
        INSERT INTO profiles (
          id,
          email,
          full_name,
          role,
          status,
          schema_name,
          created_at,
          updated_at
        ) VALUES (
          admin_user.id,
          admin_user.email,
          admin_user.full_name,
          admin_user.role,
          admin_user.status,
          schema_name,
          admin_user.created_at,
          admin_user.updated_at
        )
        ON CONFLICT (id, schema_name) DO UPDATE
        SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Error creating admin profile in schema %: %', schema_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END;
$$;