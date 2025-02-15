-- Create required types in public schema
CREATE TYPE IF NOT EXISTS public.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE IF NOT EXISTS public.user_status AS ENUM ('active', 'inactive', 'pending');

-- Create required schemas
CREATE SCHEMA IF NOT EXISTS quimicinter;
CREATE SCHEMA IF NOT EXISTS qalinkforce;

-- Add role column to quimicinter.profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'quimicinter' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE quimicinter.profiles 
    ADD COLUMN role public.user_role NOT NULL DEFAULT 'user'::public.user_role;
  END IF;
END $$;

-- Add role column to qalinkforce.profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'qalinkforce' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE qalinkforce.profiles 
    ADD COLUMN role public.user_role NOT NULL DEFAULT 'user'::public.user_role;
  END IF;
END $$;

-- Update RLS policies for quimicinter schema
DROP POLICY IF EXISTS "schema_based_select" ON quimicinter.profiles;
CREATE POLICY "schema_based_select" ON quimicinter.profiles
    FOR SELECT TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'quimicinter')
        OR role::text = 'admin'
    );

-- Update RLS policies for qalinkforce schema
DROP POLICY IF EXISTS "schema_based_select" ON qalinkforce.profiles;
CREATE POLICY "schema_based_select" ON qalinkforce.profiles
    FOR SELECT TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'qalinkforce')
        OR role::text = 'admin'
    );

-- Sync admin users across schemas
DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    -- Get admin users from public schema
    FOR v_admin_id IN 
        SELECT id FROM public.profiles 
        WHERE role::text = 'admin'
    LOOP
        -- Sync to quimicinter schema
        INSERT INTO quimicinter.profiles (
            id, 
            full_name, 
            role, 
            status, 
            phone_number, 
            schema_name
        )
        SELECT 
            id, 
            full_name, 
            'admin'::public.user_role, 
            status, 
            phone_number, 
            'quimicinter'
        FROM public.profiles
        WHERE id = v_admin_id
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin'::public.user_role,
            updated_at = now();

        -- Sync to qalinkforce schema
        INSERT INTO qalinkforce.profiles (
            id, 
            full_name, 
            role, 
            status, 
            phone_number, 
            schema_name
        )
        SELECT 
            id, 
            full_name, 
            'admin'::public.user_role, 
            status, 
            phone_number, 
            'qalinkforce'
        FROM public.profiles
        WHERE id = v_admin_id
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin'::public.user_role,
            updated_at = now();
    END LOOP;
END $$;