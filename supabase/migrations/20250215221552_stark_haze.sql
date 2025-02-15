-- Create required types if they don't exist
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

-- Create base profiles table structure in each schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role user_role NOT NULL DEFAULT 'user'::user_role,
    status user_status NOT NULL DEFAULT 'pending'::user_status,
    phone_number text,
    last_login timestamptz,
    schema_name text NOT NULL DEFAULT 'public',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quimicinter.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role user_role NOT NULL DEFAULT 'user'::user_role,
    status user_status NOT NULL DEFAULT 'pending'::user_status,
    phone_number text,
    last_login timestamptz,
    schema_name text NOT NULL DEFAULT 'quimicinter',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qalinkforce.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role user_role NOT NULL DEFAULT 'user'::user_role,
    status user_status NOT NULL DEFAULT 'pending'::user_status,
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

-- Create indexes for each schema
CREATE INDEX IF NOT EXISTS idx_public_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_public_profiles_schema ON public.profiles(schema_name);

CREATE INDEX IF NOT EXISTS idx_quimicinter_profiles_role ON quimicinter.profiles(role);
CREATE INDEX IF NOT EXISTS idx_quimicinter_profiles_schema ON quimicinter.profiles(schema_name);

CREATE INDEX IF NOT EXISTS idx_qalinkforce_profiles_role ON qalinkforce.profiles(role);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_profiles_schema ON qalinkforce.profiles(schema_name);

-- Drop existing policies before creating new ones
DROP POLICY IF EXISTS "Users can view profiles in their schema" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "New users can be created in current schema" ON public.profiles;

-- Create RLS policies for public schema
CREATE POLICY "Users can view profiles in their schema"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
        OR role = 'admin'::user_role
    );

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "New users can be created in current schema"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'public')
        OR EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'::user_role
        )
    );

-- Drop existing policies for quimicinter schema
DROP POLICY IF EXISTS "Users can view profiles in their schema" ON quimicinter.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON quimicinter.profiles;
DROP POLICY IF EXISTS "New users can be created in current schema" ON quimicinter.profiles;

-- Create RLS policies for quimicinter schema
CREATE POLICY "Users can view profiles in their schema"
    ON quimicinter.profiles FOR SELECT
    TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'quimicinter')
        OR role = 'admin'::user_role
    );

CREATE POLICY "Users can update own profile"
    ON quimicinter.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "New users can be created in current schema"
    ON quimicinter.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'quimicinter')
        OR EXISTS (
            SELECT 1 
            FROM quimicinter.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'::user_role
        )
    );

-- Drop existing policies for qalinkforce schema
DROP POLICY IF EXISTS "Users can view profiles in their schema" ON qalinkforce.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON qalinkforce.profiles;
DROP POLICY IF EXISTS "New users can be created in current schema" ON qalinkforce.profiles;

-- Create RLS policies for qalinkforce schema
CREATE POLICY "Users can view profiles in their schema"
    ON qalinkforce.profiles FOR SELECT
    TO authenticated
    USING (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'qalinkforce')
        OR role = 'admin'::user_role
    );

CREATE POLICY "Users can update own profile"
    ON qalinkforce.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "New users can be created in current schema"
    ON qalinkforce.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'qalinkforce')
        OR EXISTS (
            SELECT 1 
            FROM qalinkforce.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'::user_role
        )
    );

-- Function to sync admin profiles across schemas
CREATE OR REPLACE FUNCTION sync_admin_profiles()
RETURNS trigger AS $$
BEGIN
    IF NEW.role = 'admin'::user_role THEN
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
    WHEN (NEW.role = 'admin'::user_role)
    EXECUTE FUNCTION sync_admin_profiles();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
    -- Get schema from request headers
    NEW.schema_name := COALESCE(
        current_setting('request.headers', true)::json->>'x-schema-name',
        'public'
    );
    
    -- Set default values
    NEW.role := 'user'::user_role;
    NEW.status := 'active'::user_status;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

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
        INSERT INTO public.profiles (id, full_name, role, status, schema_name)
        VALUES (v_admin_id, 'Julio Veras', 'admin'::user_role, 'active'::user_status, 'public')
        ON CONFLICT (id) DO UPDATE SET 
            role = 'admin'::user_role,
            schema_name = 'public',
            updated_at = now();
    END IF;
END $$;