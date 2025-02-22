-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read for authenticated users" ON account_movements;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON account_movements;

-- Create new RLS policies for account_movements
CREATE POLICY "account_movements_select_policy"
  ON account_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "account_movements_insert_policy"
  ON account_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create the same policies for each schema
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Enable read for authenticated users" ON %I.account_movements;
      DROP POLICY IF EXISTS "Enable insert for authenticated users" ON %I.account_movements;

      CREATE POLICY "account_movements_select_policy"
        ON %I.account_movements FOR SELECT
        TO authenticated
        USING (true);

      CREATE POLICY "account_movements_insert_policy"
        ON %I.account_movements FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = created_by);
    ', schema_name, schema_name, schema_name, schema_name);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quimicinter.account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.account_movements ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_movements_account ON account_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_date ON account_movements(date);
CREATE INDEX IF NOT EXISTS idx_account_movements_type ON account_movements(type);
CREATE INDEX IF NOT EXISTS idx_account_movements_reference ON account_movements(reference_type, reference_id);

-- Create same indexes in other schemas
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_account_movements_account ON %I.account_movements(account_id);
      CREATE INDEX IF NOT EXISTS idx_%I_account_movements_date ON %I.account_movements(date);
      CREATE INDEX IF NOT EXISTS idx_%I_account_movements_type ON %I.account_movements(type);
      CREATE INDEX IF NOT EXISTS idx_%I_account_movements_reference ON %I.account_movements(reference_type, reference_id);
    ', 
    schema_name, schema_name,
    schema_name, schema_name,
    schema_name, schema_name,
    schema_name, schema_name);
  END LOOP;
END $$;