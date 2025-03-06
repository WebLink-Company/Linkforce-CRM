/*
  # Make supplier optional for expenses

  1. Changes
    - Make supplier_id nullable in expenses table
    - Update existing constraints and foreign keys
  
  2. Security
    - No changes to RLS policies required
*/

-- Make supplier_id nullable in expenses table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    AND column_name = 'supplier_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE expenses ALTER COLUMN supplier_id DROP NOT NULL;
  END IF;
END $$;

-- Update foreign key to be deferrable
DO $$ 
BEGIN
  -- First drop the existing foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'expenses_supplier_id_fkey'
  ) THEN
    ALTER TABLE expenses DROP CONSTRAINT expenses_supplier_id_fkey;
  END IF;

  -- Add the new deferrable foreign key
  ALTER TABLE expenses
    ADD CONSTRAINT expenses_supplier_id_fkey 
    FOREIGN KEY (supplier_id) 
    REFERENCES suppliers(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
END $$;