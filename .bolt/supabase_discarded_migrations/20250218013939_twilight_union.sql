-- Function to safely create policy
CREATE OR REPLACE FUNCTION create_safe_policy(
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
BEGIN
  -- Drop policy if exists
  EXECUTE format('
    DO $$ 
    BEGIN
      DROP POLICY IF EXISTS %I ON %I.%I;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END $$;',
    p_policy_name, p_schema, p_table
  );

  -- Create new policy
  EXECUTE format('
    CREATE POLICY %I ON %I.%I
    FOR %s TO authenticated
    USING (%s)
    %s',
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
SELECT create_safe_policy(
  'quimicinter',
  'profiles',
  'quimicinter_profiles_read',
  'SELECT',
  'true'
);

SELECT create_safe_policy(
  'quimicinter',
  'profiles',
  'quimicinter_profiles_insert',
  'INSERT',
  'true',
  'true'
);

SELECT create_safe_policy(
  'quimicinter',
  'profiles',
  'quimicinter_profiles_update',
  'UPDATE',
  'auth.uid() = id OR EXISTS (SELECT 1 FROM quimicinter.profiles WHERE id = auth.uid() AND role = ''admin'')',
  'true'
);

-- Create policies for qalinkforce schema
SELECT create_safe_policy(
  'qalinkforce',
  'profiles',
  'qalinkforce_profiles_read',
  'SELECT',
  'true'
);

SELECT create_safe_policy(
  'qalinkforce',
  'profiles',
  'qalinkforce_profiles_insert',
  'INSERT',
  'true',
  'true'
);

SELECT create_safe_policy(
  'qalinkforce',
  'profiles',
  'qalinkforce_profiles_update',
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