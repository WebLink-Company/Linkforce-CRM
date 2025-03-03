-- Function to safely check and create policy
CREATE OR REPLACE FUNCTION safe_create_policy(
  p_schema text,
  p_table text, 
  p_policy_name text,
  p_command text,
  p_using text,
  p_check text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_policy_exists boolean;
BEGIN
  -- Check if policy exists
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = %L 
      AND tablename = %L 
      AND policyname = %L
    )', p_schema, p_table, p_policy_name) 
  INTO v_policy_exists;

  -- Drop existing policy if found
  IF v_policy_exists THEN
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I.%I
    ', p_policy_name, p_schema, p_table);
  END IF;

  -- Create new policy
  EXECUTE format('
    CREATE POLICY %I ON %I.%I
    FOR %s TO authenticated
    USING (%s)
    %s
  ', 
    p_policy_name,
    p_schema,
    p_table,
    p_command,
    p_using,
    CASE WHEN p_check IS NOT NULL THEN format('WITH CHECK (%s)', p_check) ELSE '' END
  );
END;
$$;

-- Create policies for quimicinter schema
SELECT safe_create_policy(
  'quimicinter',
  'profiles',
  'quimicinter_read_policy',
  'SELECT',
  'true'
);

SELECT safe_create_policy(
  'quimicinter',
  'profiles',
  'quimicinter_insert_policy',
  'INSERT',
  'true',
  'true'
);

SELECT safe_create_policy(
  'quimicinter',
  'profiles',
  'quimicinter_update_policy',
  'UPDATE',
  'auth.uid() = id OR EXISTS (SELECT 1 FROM quimicinter.profiles WHERE id = auth.uid() AND role = ''admin'')',
  'true'
);

-- Create policies for qalinkforce schema
SELECT safe_create_policy(
  'qalinkforce',
  'profiles',
  'qalinkforce_read_policy',
  'SELECT',
  'true'
);

SELECT safe_create_policy(
  'qalinkforce',
  'profiles',
  'qalinkforce_insert_policy',
  'INSERT',
  'true',
  'true'
);

SELECT safe_create_policy(
  'qalinkforce',
  'profiles',
  'qalinkforce_update_policy',
  'UPDATE',
  'auth.uid() = id OR EXISTS (SELECT 1 FROM qalinkforce.profiles WHERE id = auth.uid() AND role = ''admin'')',
  'true'
);

-- Ensure RLS is enabled
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;

-- Refresh permissions
GRANT USAGE ON SCHEMA quimicinter TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA quimicinter TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA quimicinter TO authenticated;

GRANT USAGE ON SCHEMA qalinkforce TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA qalinkforce TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA qalinkforce TO authenticated;