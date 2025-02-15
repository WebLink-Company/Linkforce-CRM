-- Create purchase orders RLS policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON purchase_orders;

CREATE POLICY "Purchase orders are viewable by authenticated users"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Purchase orders can be created by authenticated users"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Purchase orders can be updated by authenticated users"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Create purchase order items RLS policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON purchase_order_items;

CREATE POLICY "Purchase order items are viewable by authenticated users"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Purchase order items can be created by authenticated users"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_orders
    WHERE id = purchase_order_id
    AND created_by = auth.uid()
  ));

CREATE POLICY "Purchase order items can be updated by authenticated users"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders
    WHERE id = purchase_order_id
    AND (created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
      )
    )
  ));

-- Add code generation for purchase orders
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number = 'PO-' || LPAD(nextval('purchase_order_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS purchase_order_number_seq START 1;

-- Create trigger
DROP TRIGGER IF EXISTS set_purchase_order_number ON purchase_orders;
CREATE TRIGGER set_purchase_order_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_purchase_order_number();

-- Ensure RLS is enabled
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;