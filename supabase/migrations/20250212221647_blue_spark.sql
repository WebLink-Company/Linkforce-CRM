-- Add unit_price column to purchase_products if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_products' 
    AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE purchase_products 
    ADD COLUMN unit_price numeric(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create function to calculate purchase order totals
CREATE OR REPLACE FUNCTION calculate_purchase_order_totals(
  p_order_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtotal numeric;
  v_tax_amount numeric;
  v_discount_amount numeric;
  v_total_amount numeric;
BEGIN
  -- Calculate totals from items
  SELECT 
    COALESCE(SUM(quantity * unit_price), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(discount_amount), 0),
    COALESCE(SUM(total_amount), 0)
  INTO 
    v_subtotal,
    v_tax_amount,
    v_discount_amount,
    v_total_amount
  FROM purchase_order_items
  WHERE purchase_order_id = p_order_id;

  -- Update purchase order
  UPDATE purchase_orders SET
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    discount_amount = v_discount_amount,
    total_amount = v_total_amount,
    updated_at = now()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'subtotal', v_subtotal,
    'tax_amount', v_tax_amount,
    'discount_amount', v_discount_amount,
    'total_amount', v_total_amount
  );
END;
$$;