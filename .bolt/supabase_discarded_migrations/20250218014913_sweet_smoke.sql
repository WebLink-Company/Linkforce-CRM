-- Function to safely drop all policies from a table
CREATE OR REPLACE FUNCTION clean_table_policies(p_schema text, p_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_policy record;
BEGIN
    -- Get all policies for the table
    FOR v_policy IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = p_schema
        AND tablename = p_table
    )
    LOOP
        -- Drop each policy
        EXECUTE format('
            DO $$ 
            BEGIN
                DROP POLICY IF EXISTS %I ON %I.%I;
            EXCEPTION WHEN undefined_object THEN
                NULL;
            END $$;',
            v_policy.policyname, p_schema, p_table
        );
    END LOOP;
END;
$$;

-- Clean up existing policies
SELECT clean_table_policies('public', 'profiles');
SELECT clean_table_policies('quimicinter', 'profiles');
SELECT clean_table_policies('qalinkforce', 'profiles');

-- Ensure RLS is enabled on all profile tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names for public schema
CREATE POLICY "public_profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "public_profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "public_profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create new policies with unique names for quimicinter schema
CREATE POLICY "quimicinter_profiles_select_policy" ON quimicinter.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "quimicinter_profiles_insert_policy" ON quimicinter.profiles
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "quimicinter_profiles_update_policy" ON quimicinter.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id 
        OR EXISTS (
            SELECT 1 FROM quimicinter.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create new policies with unique names for qalinkforce schema
CREATE POLICY "qalinkforce_profiles_select_policy" ON qalinkforce.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "qalinkforce_profiles_insert_policy" ON qalinkforce.profiles
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "qalinkforce_profiles_update_policy" ON qalinkforce.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id 
        OR EXISTS (
            SELECT 1 FROM qalinkforce.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Refresh permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA quimicinter TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA quimicinter TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA quimicinter TO authenticated;

GRANT USAGE ON SCHEMA qalinkforce TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA qalinkforce TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA qalinkforce TO authenticated;