-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON purchase_products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON purchase_products;

-- Create new policies
CREATE POLICY "Purchase products are viewable by authenticated users"
  ON purchase_products FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND status = 'active'
  );

CREATE POLICY "Purchase products can be created by authenticated users"
  ON purchase_products FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Purchase products can be updated by authenticated users"
  ON purchase_products FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Update purchase order items to reference purchase products
ALTER TABLE purchase_order_items 
  DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey,
  ADD CONSTRAINT purchase_order_items_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES purchase_products(id);