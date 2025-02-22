-- Function to copy RLS policies from public schema
CREATE OR REPLACE FUNCTION copy_rls_policies(source_schema text, dest_schema text)
RETURNS void AS $$
DECLARE
  table_record record;
  policy_record record;
BEGIN
  -- Get all tables from source schema
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = source_schema
    AND tablename NOT IN ('schema_migrations', 'schema_migrations_history')
  LOOP
    -- Get all policies for current table
    FOR policy_record IN
      SELECT 
        polname as policy_name,
        polcmd as policy_command,
        polroles as policy_roles,
        pg_get_expr(polqual, polrelid) as policy_using,
        pg_get_expr(polwithcheck, polrelid) as policy_check
      FROM pg_policy
      JOIN pg_class ON pg_class.oid = polrelid
      WHERE relname = table_record.tablename
      AND relnamespace::regnamespace::text = source_schema
    LOOP
      BEGIN
        -- Create policy in destination schema
        EXECUTE format('
          CREATE POLICY %I ON %I.%I
          FOR %s
          TO %s
          USING (%s)
          WITH CHECK (%s)
        ',
          policy_record.policy_name,
          dest_schema,
          table_record.tablename,
          policy_record.policy_command,
          array_to_string(policy_record.policy_roles, ','),
          COALESCE(
            replace(policy_record.policy_using, source_schema || '.', dest_schema || '.'),
            'true'
          ),
          COALESCE(
            replace(policy_record.policy_check, source_schema || '.', dest_schema || '.'),
            'true'
          )
        );
      EXCEPTION WHEN duplicate_object THEN
        -- Skip if policy already exists
        NULL;
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not create policy % on table %.%: %',
          policy_record.policy_name,
          dest_schema,
          table_record.tablename,
          SQLERRM;
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Copy RLS policies to qalinkforce schema
SELECT copy_rls_policies('public', 'qalinkforce');

-- Copy RLS policies to quimicinter schema
SELECT copy_rls_policies('public', 'quimicinter');

-- Drop the helper function
DROP FUNCTION copy_rls_policies(text, text);