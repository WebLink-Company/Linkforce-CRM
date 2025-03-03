-- Function to copy RLS policies from public schema
CREATE OR REPLACE FUNCTION copy_public_policies(dest_schema text)
RETURNS void AS $$
DECLARE
  table_record record;
  policy_record record;
  policy_exists boolean;
BEGIN
  -- Get all tables from public schema
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations', 'schema_migrations_history')
  LOOP
    -- Check if table exists in destination schema
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = dest_schema 
      AND tablename = table_record.tablename
    ) THEN
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
        AND relnamespace::regnamespace::text = 'public'
      LOOP
        -- Check if policy already exists
        EXECUTE format('
          SELECT EXISTS (
            SELECT 1 
            FROM pg_policy p
            JOIN pg_class c ON p.polrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = %L
            AND c.relname = %L
            AND p.polname = %L
          )', dest_schema, table_record.tablename, policy_record.policy_name)
        INTO policy_exists;

        IF NOT policy_exists THEN
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
                replace(policy_record.policy_using, 'public.', dest_schema || '.'),
                'true'
              ),
              COALESCE(
                replace(policy_record.policy_check, 'public.', dest_schema || '.'),
                'true'
              )
            );
            
            RAISE NOTICE 'Created policy % on table %.%',
              policy_record.policy_name,
              dest_schema,
              table_record.tablename;

          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create policy % on table %.%: %',
              policy_record.policy_name,
              dest_schema,
              table_record.tablename,
              SQLERRM;
          END;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Copy policies from public to qalinkforce
SELECT copy_public_policies('qalinkforce');

-- Copy policies from public to quimicinter
SELECT copy_public_policies('quimicinter');

-- Drop the helper function
DROP FUNCTION copy_public_policies(text);