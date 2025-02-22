-- Add status column to inventory_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Create index on status column
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);

-- Update RLS policies for inventory_items
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_items;
CREATE POLICY "inventory_items_select_policy" ON inventory_items
  FOR SELECT TO authenticated
  USING (status = 'active');

-- Add status column to inventory_items in other schemas
DO $$ 
BEGIN
  -- Add to quimicinter schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'quimicinter'
    AND table_name = 'inventory_items' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE quimicinter.inventory_items ADD COLUMN status text NOT NULL DEFAULT 'active';
    CREATE INDEX idx_quimicinter_inventory_items_status ON quimicinter.inventory_items(status);
  END IF;

  -- Add to qalinkforce schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'qalinkforce'
    AND table_name = 'inventory_items' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE qalinkforce.inventory_items ADD COLUMN status text NOT NULL DEFAULT 'active';
    CREATE INDEX idx_qalinkforce_inventory_items_status ON qalinkforce.inventory_items(status);
  END IF;
END $$;