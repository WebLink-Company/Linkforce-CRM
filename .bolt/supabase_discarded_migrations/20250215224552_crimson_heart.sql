-- Function to verify and fix profile table structure
CREATE OR REPLACE FUNCTION verify_profile_table_structure(schema_name text)
RETURNS void AS $$
DECLARE
  column_exists boolean;
BEGIN
  -- Check role column
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = %L 
      AND table_name = ''profiles'' 
      AND column_name = ''role''
    )', schema_name) INTO column_exists;
    
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding role column to %.profiles', schema_name;
    EXECUTE format('
      ALTER TABLE %I.profiles 
      ADD COLUMN role public.user_role NOT NULL DEFAULT ''user''::public.user_role
    ', schema_name);
  END IF;

  -- Check schema_name column
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = %L 
      AND table_name = ''profiles'' 
      AND column_name = ''schema_name''
    )', schema_name) INTO column_exists;
    
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding schema_name column to %.profiles', schema_name;
    EXECUTE format('
      ALTER TABLE %I.profiles 
      ADD COLUMN schema_name text NOT NULL DEFAULT %L
    ', schema_name, schema_name);
  END IF;

  -- Ensure schema_name values are correct
  EXECUTE format('
    UPDATE %I.profiles 
    SET schema_name = %L 
    WHERE schema_name != %L
  ', schema_name, schema_name, schema_name);

  -- Create or replace RLS policies
  EXECUTE format('
    DROP POLICY IF EXISTS "schema_access_policy" ON %I.profiles;
    CREATE POLICY "schema_access_policy" ON %I.profiles
      FOR ALL TO authenticated
      USING (
        -- Users can access their own profile
        auth.uid() = id
        -- Users can access profiles in their schema
        OR schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
        -- Admins can access all profiles
        OR role::text = ''admin''
      )
      WITH CHECK (
        -- Users can only modify their own profile
        auth.uid() = id
        -- Admins can modify any profile in their schema
        OR (
          role::text = ''admin'' 
          AND schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
        )
      );
  ', schema_name, schema_name);

  -- Create indexes
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_%I_profiles_role ON %I.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_%I_profiles_schema ON %I.profiles(schema_name);
  ', schema_name, schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Verify and fix all schemas
SELECT verify_profile_table_structure('public');
SELECT verify_profile_table_structure('quimicinter');
SELECT verify_profile_table_structure('qalinkforce');

-- Function to verify admin access across schemas
CREATE OR REPLACE FUNCTION verify_admin_access()
RETURNS void AS $$
DECLARE
  v_admin_id uuid;
  v_schema text;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE raw_user_meta_data->>'full_name' = 'Julio Veras';

  IF FOUND THEN
    -- Verify admin access in each schema
    FOR v_schema IN SELECT UNNEST(ARRAY['public', 'quimicinter', 'qalinkforce'])
    LOOP
      -- Ensure admin profile exists with correct role
      EXECUTE format('
        INSERT INTO %I.profiles (
          id,
          full_name,
          role,
          status,
          schema_name
        ) VALUES (
          %L,
          ''Julio Veras'',
          ''admin''::public.user_role,
          ''active''::public.user_status,
          %L
        )
        ON CONFLICT (id) DO UPDATE SET
          role = ''admin''::public.user_role,
          status = ''active''::public.user_status,
          schema_name = %L,
          updated_at = now()
      ', v_schema, v_admin_id, v_schema, v_schema);
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Verify admin access
SELECT verify_admin_access();

-- Create function to validate schema access
CREATE OR REPLACE FUNCTION validate_schema_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema text;
  v_role public.user_role;
  v_user_schema text;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Get user's role and schema
  EXECUTE format('
    SELECT role, schema_name 
    FROM %I.profiles 
    WHERE id = %L
  ', v_schema, user_id) 
  INTO v_role, v_user_schema;
  
  -- Admins can access all schemas
  IF v_role = 'admin'::public.user_role THEN
    RETURN true;
  END IF;
  
  -- Users can only access their assigned schema
  RETURN v_user_schema = v_schema;
END;
$$;