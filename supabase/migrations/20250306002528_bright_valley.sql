/*
  # Update purchase orders table

  1. Changes
    - Make order number generation optional
    - Allow manual entry of order numbers
    - Update trigger to only generate number if not provided

  2. Security
    - Maintain existing RLS policies
*/

-- Modify the trigger function to check if number is provided
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate number if not provided
  IF NEW.number IS NULL THEN
    NEW.number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                  LPAD(COALESCE(
                    (SELECT COUNT(*) + 1 
                     FROM purchase_orders 
                     WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                    )::text, '1'), 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the NOT NULL constraint from the number column
ALTER TABLE purchase_orders ALTER COLUMN number DROP NOT NULL;

-- Add a unique constraint to ensure no duplicate numbers
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_number_unique UNIQUE (number);