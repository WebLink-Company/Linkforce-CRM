-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Categories are viewable by authenticated users" ON inventory_categories;
DROP POLICY IF EXISTS "Categories are manageable by admins and managers" ON inventory_categories;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON inventory_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON inventory_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;