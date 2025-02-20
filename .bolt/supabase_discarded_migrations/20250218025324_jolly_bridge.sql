-- Grant schema usage
GRANT USAGE ON SCHEMA qalinkforce TO authenticated;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA qalinkforce TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA qalinkforce TO authenticated;

-- Enable RLS on all tables
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.inventory_items ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "qalinkforce_profiles_select"
  ON qalinkforce.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "qalinkforce_profiles_insert"
  ON qalinkforce.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "qalinkforce_profiles_update"
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

-- Create policies for customers
CREATE POLICY "qalinkforce_customers_select"
  ON qalinkforce.customers FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "qalinkforce_customers_insert"
  ON qalinkforce.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "qalinkforce_customers_update"
  ON qalinkforce.customers FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for inventory
CREATE POLICY "qalinkforce_inventory_select"
  ON qalinkforce.inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "qalinkforce_inventory_insert"
  ON qalinkforce.inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "qalinkforce_inventory_update"
  ON qalinkforce.inventory_items FOR UPDATE
  TO authenticated
  USING (true);

-- Ensure schema exists in search_path
ALTER DATABASE postgres SET search_path TO public, qalinkforce;