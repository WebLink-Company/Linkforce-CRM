-- Function to create schema if it doesn't exist
CREATE OR REPLACE FUNCTION create_schema_if_not_exists(p_schema_name text)
RETURNS void AS $$
DECLARE
  v_schema_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name::text = p_schema_name::text
    ) INTO v_schema_exists;
    
    IF NOT v_schema_exists THEN
        EXECUTE format('CREATE SCHEMA %I', p_schema_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create required schemas
SELECT create_schema_if_not_exists('quimicinter');
SELECT create_schema_if_not_exists('qalinkforce');

-- Function to update schema
CREATE OR REPLACE FUNCTION update_schema_profiles(p_schema text)
RETURNS void AS $$
DECLARE
  v_table_exists boolean;
BEGIN
    -- Check if table exists
    EXECUTE format('
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = %L 
            AND table_name = ''profiles''
        )', p_schema) INTO v_table_exists;

    -- Create table if it doesn't exist
    IF NOT v_table_exists THEN
        EXECUTE format('
            CREATE TABLE %I.profiles (
                id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                full_name text,
                role user_role DEFAULT ''user'',
                status user_status DEFAULT ''pending'',
                phone_number text,
                last_login timestamptz,
                schema_name text NOT NULL DEFAULT %L,
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            )', p_schema, p_schema);

        -- Enable RLS
        EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', p_schema);

        -- Create policies
        EXECUTE format('
            CREATE POLICY "Users can view profiles in their schema"
            ON %I.profiles FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND (
                        %I.profiles.schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
                        OR %I.profiles.role = ''admin''
                    )
                )
            )', p_schema, p_schema, p_schema);

        EXECUTE format('
            CREATE POLICY "Users can update own profile"
            ON %I.profiles FOR UPDATE
            TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id)', p_schema);

        EXECUTE format('
            CREATE POLICY "New users can be created in current schema"
            ON %I.profiles FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND (
                        schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
                        OR EXISTS (
                            SELECT 1 
                            FROM %I.profiles 
                            WHERE id = auth.uid() 
                            AND role = ''admin''
                        )
                    )
                )
            )', p_schema, p_schema);

        -- Create indexes
        EXECUTE format('
            CREATE INDEX idx_%I_profiles_role ON %I.profiles(role);
            CREATE INDEX idx_%I_profiles_schema ON %I.profiles(schema_name)',
            p_schema, p_schema, p_schema, p_schema);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update all schemas
SELECT update_schema_profiles('public');
SELECT update_schema_profiles('quimicinter');
SELECT update_schema_profiles('qalinkforce');

-- Create function to sync admin users across schemas
CREATE OR REPLACE FUNCTION sync_admin_profiles()
RETURNS trigger AS $$
BEGIN
    IF NEW.role = 'admin' THEN
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

-- Create trigger to sync admin profiles
DROP TRIGGER IF EXISTS sync_admin_profiles_trigger ON profiles;
CREATE TRIGGER sync_admin_profiles_trigger
    AFTER INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    WHEN (NEW.role = 'admin')
    EXECUTE FUNCTION sync_admin_profiles();

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
        -- Update in public schema
        INSERT INTO public.profiles (id, full_name, role, status, schema_name)
        VALUES (v_admin_id, 'Julio Veras', 'admin', 'active', 'public')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();

        -- Update in quimicinter schema
        INSERT INTO quimicinter.profiles (id, full_name, role, status, schema_name)
        VALUES (v_admin_id, 'Julio Veras', 'admin', 'active', 'quimicinter')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();

        -- Update in qalinkforce schema
        INSERT INTO qalinkforce.profiles (id, full_name, role, status, schema_name)
        VALUES (v_admin_id, 'Julio Veras', 'admin', 'active', 'qalinkforce')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();
    END IF;
END $$;