-- Drop existing policies
DROP POLICY IF EXISTS "Suppliers are viewable by authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can be created by authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can be updated by authenticated users" ON suppliers;

-- Create new policies with simplified checks
CREATE POLICY "Enable read access for all authenticated users"
  ON suppliers FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Enable insert for authenticated users"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for owners and admins"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Add code generation trigger
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code = 'SUP-' || LPAD(nextval('supplier_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1;

-- Create trigger
DROP TRIGGER IF EXISTS set_supplier_code ON suppliers;
CREATE TRIGGER set_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION generate_supplier_code();

-- Add code column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'code'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN code text UNIQUE;
    
    -- Generate codes for existing suppliers
    WITH numbered_suppliers AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
      FROM suppliers
      WHERE code IS NULL
    )
    UPDATE suppliers s
    SET code = 'SUP-' || LPAD(ns.rn::text, 6, '0')
    FROM numbered_suppliers ns
    WHERE s.id = ns.id;
  END IF;
END $$;