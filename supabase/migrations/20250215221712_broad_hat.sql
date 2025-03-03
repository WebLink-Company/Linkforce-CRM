-- Create required types in public schema if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
  END IF;
END $$;

-- Create required schemas
CREATE SCHEMA IF NOT EXISTS quimicinter;
CREATE SCHEMA IF NOT EXISTS qalinkforce;

-- Create types in other schemas
DO $$
BEGIN
  -- Create types in quimicinter schema
  EXECUTE 'CREATE TYPE quimicinter.user_role AS ENUM (''admin'', ''manager'', ''user'')';
  EXECUTE 'CREATE TYPE quimicinter.user_status AS ENUM (''active'', ''inactive'', ''pending'')';
  
  -- Create types in qalinkforce schema
  EXECUTE 'CREATE TYPE qalinkforce.user_role AS ENUM (''admin'', ''manager'', ''user'')';
  EXECUTE 'CREATE TYPE qalinkforce.user_status AS ENUM (''active'', ''inactive'', ''pending'')';
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

-- Update profiles table in each schema
DO $$
BEGIN
  -- Public schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role' AND data_type = 'text') THEN
    -- Convert existing text role to enum
    ALTER TABLE public.profiles 
    ALTER COLUMN role TYPE user_role 
    USING CASE 
      WHEN role = 'admin' THEN 'admin'::user_role
      WHEN role = 'manager' THEN 'manager'::user_role
      ELSE 'user'::user_role
    END;
  END IF;

  -- Quimicinter schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'quimicinter' AND table_name = 'profiles' AND column_name = 'role' AND data_type = 'text') THEN
    ALTER TABLE quimicinter.profiles 
    ALTER COLUMN role TYPE quimicinter.user_role 
    USING CASE 
      WHEN role = 'admin' THEN 'admin'::quimicinter.user_role
      WHEN role = 'manager' THEN 'manager'::quimicinter.user_role
      ELSE 'user'::quimicinter.user_role
    END;
  END IF;

  -- Qalinkforce schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'qalinkforce' AND table_name = 'profiles' AND column_name = 'role' AND data_type = 'text') THEN
    ALTER TABLE qalinkforce.profiles 
    ALTER COLUMN role TYPE qalinkforce.user_role 
    USING CASE 
      WHEN role = 'admin' THEN 'admin'::qalinkforce.user_role
      WHEN role = 'manager' THEN 'manager'::qalinkforce.user_role
      ELSE 'user'::qalinkforce.user_role
    END;
  END IF;
END $$;

-- Update RLS policies to use proper type casting
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT UNNEST(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Users can view profiles in their schema" ON %I.profiles;
      CREATE POLICY "Users can view profiles in their schema"
        ON %I.profiles FOR SELECT
        TO authenticated
        USING (
          schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
          OR role::text = ''admin''
        );
    ', schema_name, schema_name);
  END LOOP;
END $$;

-- Update sync_admin_profiles function to handle type casting
CREATE OR REPLACE FUNCTION sync_admin_profiles()
RETURNS trigger AS $$
BEGIN
    IF NEW.role::text = 'admin' THEN
        -- Sync to quimicinter schema
        INSERT INTO quimicinter.profiles (
            id, full_name, role, status, phone_number, schema_name
        ) VALUES (
            NEW.id, NEW.full_name, NEW.role::text::quimicinter.user_role, 
            NEW.status::text::quimicinter.user_status, NEW.phone_number, 'quimicinter'
        ) ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            updated_at = now();

        -- Sync to qalinkforce schema
        INSERT INTO qalinkforce.profiles (
            id, full_name, role, status, phone_number, schema_name
        ) VALUES (
            NEW.id, NEW.full_name, NEW.role::text::qalinkforce.user_role,
            NEW.status::text::qalinkforce.user_status, NEW.phone_number, 'qalinkforce'
        ) ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update handle_new_user function to use proper type casting
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
DECLARE
    v_schema text;
BEGIN
    -- Get schema from request headers
    v_schema := COALESCE(
        current_setting('request.headers', true)::json->>'x-schema-name',
        'public'
    );
    
    -- Set schema_name and role
    NEW.schema_name := v_schema;
    NEW.role := 'user'::user_role;
    NEW.status := 'active'::user_status;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;