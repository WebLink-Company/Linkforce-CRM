-- Drop existing policies from all schemas
DROP POLICY IF EXISTS "profiles_read_policy" ON quimicinter.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON quimicinter.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON quimicinter.profiles;

DROP POLICY IF EXISTS "profiles_read_policy" ON qalinkforce.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON qalinkforce.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON qalinkforce.profiles;

-- Create policies with unique names for quimicinter schema
CREATE POLICY "quimicinter_profiles_read_policy"
  ON quimicinter.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "quimicinter_profiles_insert_policy"
  ON quimicinter.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "quimicinter_profiles_update_policy"
  ON quimicinter.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM quimicinter.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create policies with unique names for qalinkforce schema
CREATE POLICY "qalinkforce_profiles_read_policy"
  ON qalinkforce.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "qalinkforce_profiles_insert_policy"
  ON qalinkforce.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "qalinkforce_profiles_update_policy"
  ON qalinkforce.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM qalinkforce.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Verify RLS is enabled
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;

-- Refresh permissions
GRANT USAGE ON SCHEMA quimicinter TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA quimicinter TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA quimicinter TO authenticated;

GRANT USAGE ON SCHEMA qalinkforce TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA qalinkforce TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA qalinkforce TO authenticated;