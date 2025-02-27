-- Drop existing functions first
DROP FUNCTION IF EXISTS validate_schema_access(uuid, text);
DROP FUNCTION IF EXISTS get_user_schema(uuid);

-- Drop existing policies
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "profiles_read_policy" ON %I.profiles;
      DROP POLICY IF EXISTS "profiles_insert_policy" ON %I.profiles;
      DROP POLICY IF EXISTS "profiles_update_policy" ON %I.profiles;
    ', schema_name, schema_name, schema_name);
  END LOOP;
END $$;

-- Create new RLS policies that allow cross-schema access for admins
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      -- Allow read access to all authenticated users
      CREATE POLICY "profiles_read_policy"
        ON %I.profiles FOR SELECT
        TO authenticated
        USING (true);

      -- Allow insert for authenticated users
      CREATE POLICY "profiles_insert_policy"
        ON %I.profiles FOR INSERT
        TO authenticated
        WITH CHECK (true);

      -- Allow update for self or admins
      CREATE POLICY "profiles_update_policy"
        ON %I.profiles FOR UPDATE
        TO authenticated
        USING (
          auth.uid() = id 
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = ''admin''
          )
        );

      -- Allow delete for admins only
      CREATE POLICY "profiles_delete_policy"
        ON %I.profiles FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = ''admin''
          )
        );
    ', schema_name, schema_name, schema_name, schema_name);
  END LOOP;
END $$;

-- Create policies for other tables
DO $$ 
DECLARE
  schema_name text;
  table_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    FOR table_name IN 
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = schema_name
      AND tablename NOT IN ('profiles')
    LOOP
      EXECUTE format('
        DROP POLICY IF EXISTS "%2$I_read_policy" ON %1$I.%2$I;
        DROP POLICY IF EXISTS "%2$I_write_policy" ON %1$I.%2$I;

        CREATE POLICY "%2$I_read_policy"
          ON %1$I.%2$I FOR SELECT
          TO authenticated
          USING (true);

        CREATE POLICY "%2$I_write_policy"
          ON %1$I.%2$I FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM %1$I.profiles p
              WHERE p.id = auth.uid()
              AND p.schema_name = %3$L
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM %1$I.profiles p
              WHERE p.id = auth.uid()
              AND p.schema_name = %3$L
            )
          );
      ', schema_name, table_name, schema_name);
    END LOOP;
  END LOOP;
END $$;

-- Grant necessary permissions
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      -- Grant schema usage
      GRANT USAGE ON SCHEMA %I TO authenticated;
      GRANT USAGE ON SCHEMA %I TO anon;

      -- Grant table permissions
      GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated;
      GRANT SELECT ON ALL TABLES IN SCHEMA %I TO anon;

      -- Grant sequence permissions
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA %I TO authenticated;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA %I TO anon;

      -- Grant function permissions
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO authenticated;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO anon;
    ', 
    schema_name, schema_name,
    schema_name, schema_name,
    schema_name, schema_name,
    schema_name, schema_name);
  END LOOP;
END $$;

-- Create function to validate schema access
CREATE OR REPLACE FUNCTION validate_schema_access(
  p_user_id uuid,
  p_schema text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_role text;
  v_user_schema text;
BEGIN
  -- Get schema from parameter or request headers
  v_schema := COALESCE(
    p_schema,
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
  
  -- Check all schemas for user profile
  WITH user_profiles AS (
    SELECT role::text, schema_name
    FROM profiles
    WHERE id = p_user_id
    UNION ALL
    SELECT role::text, schema_name
    FROM quimicinter.profiles
    WHERE id = p_user_id
    UNION ALL
    SELECT role::text, schema_name
    FROM qalinkforce.profiles
    WHERE id = p_user_id
  )
  SELECT role, schema_name INTO v_role, v_user_schema
  FROM user_profiles
  LIMIT 1;
  
  -- If no profile found, access denied
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Admins can access all schemas
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Regular users must match schema
  RETURN v_user_schema = v_schema;
END;
$$;

-- Create function to get user's schema
CREATE OR REPLACE FUNCTION get_user_schema(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
BEGIN
  -- Check all schemas for user profile
  WITH user_profiles AS (
    SELECT schema_name, role::text
    FROM profiles
    WHERE id = p_user_id
    UNION ALL
    SELECT schema_name, role::text
    FROM quimicinter.profiles
    WHERE id = p_user_id
    UNION ALL
    SELECT schema_name, role::text
    FROM qalinkforce.profiles
    WHERE id = p_user_id
  )
  SELECT schema_name INTO v_schema
  FROM user_profiles
  WHERE role = 'admin'
    OR schema_name = current_setting('request.headers', true)::json->>'x-schema-name'
  LIMIT 1;

  RETURN COALESCE(v_schema, 'public');
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_schema_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_schema(uuid) TO authenticated;