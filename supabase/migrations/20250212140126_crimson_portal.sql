/*
  # Add unit price to inventory items

  1. Changes
    - Add unit_price column to inventory_items table
    - Set default value to 0
    - Make column NOT NULL to ensure data consistency

  2. Notes
    - Uses DO block to safely add column if it doesn't exist
    - Maintains existing data by setting default value
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN unit_price numeric(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;