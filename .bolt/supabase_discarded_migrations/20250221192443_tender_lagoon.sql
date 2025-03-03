-- Function to copy specific RLS policies from public schema
CREATE OR REPLACE FUNCTION copy_specific_policies(dest_schema text)
RETURNS void AS $$
BEGIN
  -- account_movements policies
  EXECUTE format('
    CREATE POLICY "Enable read for authenticated users"
    ON %I.account_movements
    FOR SELECT TO authenticated
    USING (true)
  ', dest_schema);

  -- account_periods policies
  EXECUTE format('
    CREATE POLICY "Enable read for authenticated users"
    ON %I.account_periods
    FOR SELECT TO authenticated
    USING (true)
  ', dest_schema);

  -- accounts policies
  EXECUTE format('
    CREATE POLICY "Enable read for authenticated users"
    ON %I.accounts
    FOR SELECT TO authenticated
    USING (true)
  ', dest_schema);

  -- customer_categories policies
  EXECUTE format('
    CREATE POLICY "Enable read for authenticated users"
    ON %I.customer_categories
    FOR SELECT TO authenticated
    USING (true)
  ', dest_schema);

  -- customer_transactions policies
  EXECUTE format('
    CREATE POLICY "Enable read for authenticated users"
    ON %I.customer_transactions
    FOR SELECT TO authenticated
    USING (true)
  ', dest_schema);

  -- customers policies
  EXECUTE format('
    CREATE POLICY "Enable read for authenticated users"
    ON %I.customers
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

    CREATE POLICY "Enable insert for authenticated users"
    ON %I.customers
    FOR INSERT TO authenticated
    WITH CHECK (true);

    CREATE POLICY "Enable update for authenticated users"
    ON %I.customers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
  ', dest_schema, dest_schema, dest_schema);

  -- Enable RLS on all tables
  EXECUTE format('
    ALTER TABLE %I.account_movements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE %I.account_periods ENABLE ROW LEVEL SECURITY;
    ALTER TABLE %I.accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE %I.customer_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE %I.customer_transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE %I.customers ENABLE ROW LEVEL SECURITY
  ', 
    dest_schema, dest_schema, dest_schema, 
    dest_schema, dest_schema, dest_schema
  );

END;
$$ LANGUAGE plpgsql;

-- Copy policies to qalinkforce schema
SELECT copy_specific_policies('qalinkforce');

-- Copy policies to quimicinter schema
SELECT copy_specific_policies('quimicinter');

-- Drop the helper function
DROP FUNCTION copy_specific_policies(text);