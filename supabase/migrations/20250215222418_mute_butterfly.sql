-- First, ensure the user_role type exists in public schema
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');
  END IF;
END $$;

-- Function to safely add role column to profiles table
CREATE OR REPLACE FUNCTION add_role_column_to_profiles(schema_name text)
RETURNS void AS $$
BEGIN
  -- Check if table exists first
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_name 
    AND table_name = 'profiles'
  ) THEN
    -- Add role column if it doesn't exist
    EXECUTE format('
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = %L 
          AND table_name = ''profiles'' 
          AND column_name = ''role''
        ) THEN
          ALTER TABLE %I.profiles 
          ADD COLUMN role public.user_role NOT NULL DEFAULT ''user''::public.user_role;
          
          -- Create index on role column
          CREATE INDEX IF NOT EXISTS idx_%I_profiles_role 
          ON %I.profiles(role);
        END IF;
      END $$;
    ', schema_name, schema_name, schema_name, schema_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add role column to all schemas
SELECT add_role_column_to_profiles('public');
SELECT add_role_column_to_profiles('quimicinter');
SELECT add_role_column_to_profiles('qalinkforce');

-- Update RLS policies to use role column
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT UNNEST(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    -- Drop existing policy if it exists
    EXECUTE format('
      DROP POLICY IF EXISTS "schema_based_select" ON %I.profiles;
    ', schema_name);
    
    -- Create new policy using role column
    EXECUTE format('
      CREATE POLICY "schema_based_select" ON %I.profiles
        FOR SELECT TO authenticated
        USING (
          schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', %L)
          OR role::text = ''admin''
        );
    ', schema_name, schema_name);
  END LOOP;
END $$;

-- Set initial admin in all schemas
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get Julio's user ID
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE raw_user_meta_data->>'full_name' = 'Julio Veras';

  IF FOUND THEN
    -- Update in all schemas
    FOR schema_name IN SELECT UNNEST(ARRAY['public', 'quimicinter', 'qalinkforce'])
    LOOP
      EXECUTE format('
        INSERT INTO %I.profiles (
          id, 
          full_name, 
          role, 
          schema_name
        ) VALUES (
          %L,
          ''Julio Veras'',
          ''admin''::public.user_role,
          %L
        )
        ON CONFLICT (id) DO UPDATE SET
          role = ''admin''::public.user_role,
          updated_at = now();
      ', schema_name, v_admin_id, schema_name);
    END LOOP;
  END IF;
END $$;