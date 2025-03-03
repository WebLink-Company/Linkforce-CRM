-- Drop existing types if they exist
DO $$ 
BEGIN
  DROP TYPE IF EXISTS public.user_role CASCADE;
  DROP TYPE IF EXISTS public.user_status CASCADE;
END $$;

-- Create types
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending');

-- Create required schemas
CREATE SCHEMA IF NOT EXISTS quimicinter;
CREATE SCHEMA IF NOT EXISTS qalinkforce;

-- Create base profiles table in public schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
    status public.user_status NOT NULL DEFAULT 'pending'::public.user_status,
    phone_number text,
    last_login timestamptz,
    schema_name text NOT NULL DEFAULT 'public',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create profiles table in quimicinter schema
CREATE TABLE IF NOT EXISTS quimicinter.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
    status public.user_status NOT NULL DEFAULT 'pending'::public.user_status,
    phone_number text,
    last_login timestamptz,
    schema_name text NOT NULL DEFAULT 'quimicinter',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create profiles table in qalinkforce schema
CREATE TABLE IF NOT EXISTS qalinkforce.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
    status public.user_status NOT NULL DEFAULT 'pending'::public.user_status,
    phone_number text,
    last_login timestamptz,
    schema_name text NOT NULL DEFAULT 'qalinkforce',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all profile tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public schema
CREATE POLICY "schema_based_select" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
        OR role::text = 'admin'
    );

CREATE POLICY "users_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "schema_based_insert" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

-- Create RLS policies for quimicinter schema
CREATE POLICY "schema_based_select" ON quimicinter.profiles
    FOR SELECT TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'quimicinter')
        OR role::text = 'admin'
    );

CREATE POLICY "users_update_own" ON quimicinter.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "schema_based_insert" ON quimicinter.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'quimicinter')
        OR EXISTS (
            SELECT 1 FROM quimicinter.profiles
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

-- Create RLS policies for qalinkforce schema
CREATE POLICY "schema_based_select" ON qalinkforce.profiles
    FOR SELECT TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'qalinkforce')
        OR role::text = 'admin'
    );

CREATE POLICY "users_update_own" ON qalinkforce.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "schema_based_insert" ON qalinkforce.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'qalinkforce')
        OR EXISTS (
            SELECT 1 FROM qalinkforce.profiles
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

-- Function to sync admin profiles across schemas
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

-- Set initial admin user
DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE raw_user_meta_data->>'full_name' = 'Julio Veras';

    IF FOUND THEN
        -- Insert/update in public schema
        INSERT INTO public.profiles (
            id, full_name, role, status, schema_name
        ) VALUES (
            v_admin_id, 
            'Julio Veras', 
            'admin'::public.user_role, 
            'active'::public.user_status, 
            'public'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin'::public.user_role,
            status = 'active'::public.user_status,
            updated_at = now();
    END IF;
END $$;