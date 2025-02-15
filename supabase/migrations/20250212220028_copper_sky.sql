-- Create purchase products table
CREATE TABLE IF NOT EXISTS purchase_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES supplier_categories(id),
  unit_measure text NOT NULL,
  default_supplier_id uuid REFERENCES suppliers(id),
  min_order_quantity numeric(15,2) DEFAULT 1,
  last_purchase_price numeric(15,2) DEFAULT 0,
  notes text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Add code generation trigger
CREATE OR REPLACE FUNCTION generate_purchase_product_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code = 'PP-' || LPAD(nextval('purchase_product_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS purchase_product_code_seq START 1;

-- Create trigger
DROP TRIGGER IF EXISTS set_purchase_product_code ON purchase_products;
CREATE TRIGGER set_purchase_product_code
  BEFORE INSERT ON purchase_products
  FOR EACH ROW
  EXECUTE FUNCTION generate_purchase_product_code();

-- Create supplier product prices table
CREATE TABLE IF NOT EXISTS supplier_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) NOT NULL,
  product_id uuid REFERENCES purchase_products(id) NOT NULL,
  price numeric(15,2) NOT NULL,
  min_quantity numeric(15,2) DEFAULT 1,
  is_preferred boolean DEFAULT false,
  valid_from date,
  valid_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, product_id)
);

-- Enable RLS
ALTER TABLE purchase_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_product_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON purchase_products FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Enable insert for authenticated users"
  ON purchase_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON purchase_products FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable read access for authenticated users"
  ON supplier_product_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON supplier_product_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON supplier_product_prices FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_purchase_products_code ON purchase_products(code);
CREATE INDEX idx_purchase_products_category ON purchase_products(category_id);
CREATE INDEX idx_purchase_products_supplier ON purchase_products(default_supplier_id);
CREATE INDEX idx_supplier_product_prices_supplier ON supplier_product_prices(supplier_id);
CREATE INDEX idx_supplier_product_prices_product ON supplier_product_prices(product_id);

-- Create function to get supplier product prices
CREATE OR REPLACE FUNCTION get_supplier_product_prices(
  p_supplier_id uuid,
  p_product_id uuid
)
RETURNS TABLE (
  price numeric,
  min_quantity numeric,
  is_preferred boolean,
  valid_from date,
  valid_to date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    spp.price,
    spp.min_quantity,
    spp.is_preferred,
    spp.valid_from,
    spp.valid_to
  FROM supplier_product_prices spp
  WHERE spp.supplier_id = p_supplier_id
    AND spp.product_id = p_product_id
    AND (spp.valid_to IS NULL OR spp.valid_to >= CURRENT_DATE)
  ORDER BY 
    spp.is_preferred DESC,
    spp.valid_from DESC NULLS LAST,
    spp.min_quantity ASC;
END;
$$;

-- Create function to update last purchase price
CREATE OR REPLACE FUNCTION update_last_purchase_price()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_products
  SET 
    last_purchase_price = NEW.unit_price,
    updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last purchase price
CREATE TRIGGER update_product_last_purchase_price
  AFTER INSERT ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_last_purchase_price();