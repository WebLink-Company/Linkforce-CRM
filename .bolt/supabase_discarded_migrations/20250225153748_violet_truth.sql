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
          USING (true)
          WITH CHECK (true);
      ', schema_name, table_name);
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