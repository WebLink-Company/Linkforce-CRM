-- First, ensure the types exist in public schema
DO $$ 
BEGIN
  -- Drop existing types if they exist
  DROP TYPE IF EXISTS public.user_role CASCADE;
  DROP TYPE IF EXISTS public.user_status CASCADE;
  
  -- Create types
  CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');
  CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending');
END $$;

-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS quimicinter;
CREATE SCHEMA IF NOT EXISTS qalinkforce;

-- Function to safely update profile tables
CREATE OR REPLACE FUNCTION update_profile_table(schema_name text)
RETURNS void AS $$
BEGIN
  -- Create profiles table if it doesn't exist
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text,
      phone_number text,
      last_login timestamptz,
      schema_name text NOT NULL DEFAULT %L,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', schema_name, schema_name);

  -- Add role column if it doesn't exist
  EXECUTE format('
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = %L 
        AND table_name = ''profiles'' 
        AND column_name = ''role''
      ) THEN
        ALTER TABLE %I.profiles 
        ADD COLUMN role public.user_role NOT NULL DEFAULT ''user''::public.user_role;
      END IF;
    END $$;
  ', schema_name, schema_name);

  -- Add status column if it doesn't exist
  EXECUTE format('
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = %L 
        AND table_name = ''profiles'' 
        AND column_name = ''status''
      ) THEN
        ALTER TABLE %I.profiles 
        ADD COLUMN status public.user_status NOT NULL DEFAULT ''pending''::public.user_status;
      END IF;
    END $$;
  ', schema_name, schema_name);

  -- Enable RLS
  EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', schema_name);

  -- Create or replace policies
  EXECUTE format('
    DROP POLICY IF EXISTS "schema_based_select" ON %I.profiles;
    CREATE POLICY "schema_based_select" ON %I.profiles
      FOR SELECT TO authenticated
      USING (
        schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', %L)
        OR role::text = ''admin''
      );
  ', schema_name, schema_name, schema_name);

  -- Create index on role
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_%I_profiles_role ON %I.profiles(role);
  ', schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Update all schema tables
SELECT update_profile_table('public');
SELECT update_profile_table('quimicinter');
SELECT update_profile_table('qalinkforce');

-- Create function to sync admin profiles
CREATE OR REPLACE FUNCTION sync_admin_profiles()
RETURNS trigger AS $$
BEGIN
  IF NEW.role::text = 'admin' THEN
    -- Sync to quimicinter schema
    INSERT INTO quimicinter.profiles (
      id, full_name, role, status, phone_number, schema_name
    ) VALUES (
      NEW.id, NEW.full_name, NEW.role, NEW.status, NEW.phone_number, 'quimicinter'
    ) ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      updated_at = now();

    -- Sync to qalinkforce schema
    INSERT INTO qalinkforce.profiles (
      id, full_name, role, status, phone_number, schema_name
    ) VALUES (
      NEW.id, NEW.full_name, NEW.role, NEW.status, NEW.phone_number, 'qalinkforce'
    ) ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin sync
DROP TRIGGER IF EXISTS sync_admin_profiles_trigger ON public.profiles;
CREATE TRIGGER sync_admin_profiles_trigger
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role::text = 'admin')
  EXECUTE FUNCTION sync_admin_profiles();

-- Set initial admin
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get Julio's user ID
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE raw_user_meta_data->>'full_name' = 'Julio Veras';

  IF FOUND THEN
    -- Update in public schema
    INSERT INTO public.profiles (
      id, 
      full_name, 
      role, 
      status, 
      schema_name
    ) VALUES (
      v_admin_id,
      'Julio Veras',
      'admin'::public.user_role,
      'active'::public.user_status,
      'public'
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin'::public.user_role,
      status = 'active'::public.user_status,
      updated_at = now();
  END IF;
END $$;