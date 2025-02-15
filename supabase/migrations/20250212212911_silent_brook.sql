-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read for authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON supplier_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON supplier_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON supplier_categories;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON supplier_categories_suppliers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON supplier_categories_suppliers;

-- Supplier policies
CREATE POLICY "Suppliers are viewable by authenticated users"
  ON suppliers FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Suppliers can be created by authenticated users"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Suppliers can be updated by authenticated users"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR 
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'manager')
        ));

-- Supplier categories policies
CREATE POLICY "Categories are viewable by authenticated users"
  ON supplier_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Categories can be created by authenticated users"
  ON supplier_categories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Categories can be updated by authenticated users"
  ON supplier_categories FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  ));

-- Supplier categories relations policies
CREATE POLICY "Category relations are viewable by authenticated users"
  ON supplier_categories_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Category relations can be created by authenticated users"
  ON supplier_categories_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM suppliers
    WHERE id = supplier_id
    AND created_by = auth.uid()
  ));

-- Ensure RLS is enabled
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories_suppliers ENABLE ROW LEVEL SECURITY;