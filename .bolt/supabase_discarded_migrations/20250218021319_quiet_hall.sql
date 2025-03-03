-- Grant schema usage to all roles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA quimicinter TO authenticated;
GRANT USAGE ON SCHEMA qalinkforce TO authenticated;

-- Grant table permissions in each schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA quimicinter TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA qalinkforce TO authenticated;

-- Grant sequence permissions in each schema
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA quimicinter TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA qalinkforce TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;

-- Create schema validation function
CREATE OR REPLACE FUNCTION validate_current_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema text;
  v_user_id uuid;
  v_role text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

  -- Get user's role from appropriate schema
  EXECUTE format('
    SELECT role::text 
    FROM %I.profiles 
    WHERE id = $1
  ', v_schema)
  INTO v_role
  USING v_user_id;

  -- If no role found or not admin, verify schema access
  IF v_role IS NULL OR v_role != 'admin' THEN
    -- Verify user has profile in this schema
    EXECUTE format('
      SELECT EXISTS(
        SELECT 1 
        FROM %I.profiles 
        WHERE id = $1
      )', v_schema)
    INTO STRICT v_role
    USING v_user_id;

    IF NOT v_role THEN
      RAISE EXCEPTION 'Access denied to schema %', v_schema;
    END IF;
  END IF;

  RETURN v_schema;
END;
$$;

-- Create function to handle schema-specific operations
CREATE OR REPLACE FUNCTION handle_schema_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema text;
BEGIN
  -- Get and validate schema
  v_schema := validate_current_schema();
  
  -- Set search_path to validated schema
  EXECUTE format('SET LOCAL search_path TO %I, public', v_schema);
  
  RETURN NEW;
END;
$$;

-- Create trigger for schema operations
DROP TRIGGER IF EXISTS before_schema_operation ON customers;
CREATE TRIGGER before_schema_operation
  BEFORE INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION handle_schema_operation();

-- Refresh policies for each schema
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    -- Drop existing policies
    EXECUTE format('
      DROP POLICY IF EXISTS %I_profiles_select_policy ON %I.profiles;
      DROP POLICY IF EXISTS %I_profiles_insert_policy ON %I.profiles;
      DROP POLICY IF EXISTS %I_profiles_update_policy ON %I.profiles;
    ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);

    -- Create new policies
    EXECUTE format('
      CREATE POLICY %I_profiles_select_policy ON %I.profiles
        FOR SELECT TO authenticated
        USING (true);

      CREATE POLICY %I_profiles_insert_policy ON %I.profiles
        FOR INSERT TO authenticated
        WITH CHECK (
          auth.uid() = id 
          OR 
          EXISTS (
            SELECT 1 FROM %I.profiles
            WHERE id = auth.uid()
            AND role = ''admin''
          )
        );

      CREATE POLICY %I_profiles_update_policy ON %I.profiles
        FOR UPDATE TO authenticated
        USING (
          auth.uid() = id 
          OR 
          EXISTS (
            SELECT 1 FROM %I.profiles
            WHERE id = auth.uid()
            AND role = ''admin''
          )
        );
    ', 
    schema_name, schema_name,
    schema_name, schema_name, schema_name,
    schema_name, schema_name, schema_name);
  END LOOP;
END $$;