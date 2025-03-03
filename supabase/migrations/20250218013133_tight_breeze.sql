-- Create trigger for new users in quimicinter schema
DROP TRIGGER IF EXISTS on_auth_user_created_quimicinter ON auth.users;
CREATE TRIGGER on_auth_user_created_quimicinter
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION quimicinter.handle_new_auth_user();

-- Create trigger for new users in qalinkforce schema
DROP TRIGGER IF EXISTS on_auth_user_created_qalinkforce ON auth.users;
CREATE TRIGGER on_auth_user_created_qalinkforce
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION qalinkforce.handle_new_auth_user();

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

-- Create function to sync admin profiles across schemas
CREATE OR REPLACE FUNCTION sync_admin_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    -- Sync to quimicinter schema
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
      NEW.full_name,
      'admin',
      NEW.status,
      'quimicinter',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = 'admin',
      updated_at = now();

    -- Sync to qalinkforce schema
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
      NEW.full_name,
      'admin',
      NEW.status,
      'qalinkforce',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = 'admin',
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for syncing admin profiles
DROP TRIGGER IF EXISTS sync_admin_profiles_trigger ON profiles;
CREATE TRIGGER sync_admin_profiles_trigger
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION sync_admin_profiles();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quimicinter_profiles_role ON quimicinter.profiles(role);
CREATE INDEX IF NOT EXISTS idx_quimicinter_profiles_email ON quimicinter.profiles(email);
CREATE INDEX IF NOT EXISTS idx_quimicinter_profiles_schema ON quimicinter.profiles(schema_name);

CREATE INDEX IF NOT EXISTS idx_qalinkforce_profiles_role ON qalinkforce.profiles(role);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_profiles_email ON qalinkforce.profiles(email);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_profiles_schema ON qalinkforce.profiles(schema_name);