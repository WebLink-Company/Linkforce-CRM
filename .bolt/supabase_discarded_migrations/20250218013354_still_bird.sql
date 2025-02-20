-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created_quimicinter ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_qalinkforce ON auth.users;

-- Create profiles tables in other schemas if they don't exist
CREATE TABLE IF NOT EXISTS quimicinter.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role quimicinter.user_role NOT NULL DEFAULT 'user',
  status quimicinter.user_status NOT NULL DEFAULT 'pending',
  phone_number text,
  last_login timestamptz,
  schema_name text NOT NULL DEFAULT 'quimicinter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qalinkforce.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role qalinkforce.user_role NOT NULL DEFAULT 'user',
  status qalinkforce.user_status NOT NULL DEFAULT 'pending',
  phone_number text,
  last_login timestamptz,
  schema_name text NOT NULL DEFAULT 'qalinkforce',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or replace functions in each schema
CREATE OR REPLACE FUNCTION quimicinter.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quimicinter
AS $$
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM quimicinter.profiles 
    WHERE id = NEW.id OR email = NEW.email
  ) THEN
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
      COALESCE(NEW.raw_user_meta_data->>'role', 'user')::quimicinter.user_role,
      'active',
      'quimicinter',
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION qalinkforce.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = qalinkforce
AS $$
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM qalinkforce.profiles 
    WHERE id = NEW.id OR email = NEW.email
  ) THEN
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
      COALESCE(NEW.raw_user_meta_data->>'role', 'user')::qalinkforce.user_role,
      'active',
      'qalinkforce',
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create new triggers
CREATE TRIGGER on_auth_user_created_quimicinter
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION quimicinter.handle_new_auth_user();

CREATE TRIGGER on_auth_user_created_qalinkforce
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION qalinkforce.handle_new_auth_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA quimicinter TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA quimicinter TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA quimicinter TO authenticated;

GRANT USAGE ON SCHEMA qalinkforce TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA qalinkforce TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA qalinkforce TO authenticated;

-- Enable RLS on profiles tables
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quimicinter schema
CREATE POLICY "profiles_read_policy"
  ON quimicinter.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON quimicinter.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

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
CREATE POLICY "profiles_read_policy"
  ON qalinkforce.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON qalinkforce.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

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