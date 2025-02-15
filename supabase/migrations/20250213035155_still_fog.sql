-- Add current_stock column to purchase_products if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_products' 
    AND column_name = 'current_stock'
  ) THEN
    ALTER TABLE purchase_products 
    ADD COLUMN current_stock numeric(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create index on current_stock column
CREATE INDEX IF NOT EXISTS idx_purchase_products_stock 
  ON purchase_products(current_stock);

-- Create function to update purchase product stock
CREATE OR REPLACE FUNCTION update_purchase_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stock based on movement type
  UPDATE purchase_products
  SET 
    current_stock = CASE 
      WHEN NEW.movement_type = 'in' THEN current_stock + NEW.quantity
      WHEN NEW.movement_type = 'out' THEN current_stock - NEW.quantity
      ELSE NEW.new_stock
    END,
    updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
DROP TRIGGER IF EXISTS update_product_stock ON purchase_order_items;
CREATE TRIGGER update_product_stock
  AFTER INSERT ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_product_stock();