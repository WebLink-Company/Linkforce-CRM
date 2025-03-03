-- Add deleted_at column to inventory_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create index on deleted_at column
CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at ON inventory_items(deleted_at);

-- Add deleted_at column to inventory_items in other schemas
DO $$ 
BEGIN
  -- Add to quimicinter schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'quimicinter'
    AND table_name = 'inventory_items' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE quimicinter.inventory_items ADD COLUMN deleted_at timestamptz;
    CREATE INDEX idx_quimicinter_inventory_items_deleted_at ON quimicinter.inventory_items(deleted_at);
  END IF;

  -- Add to qalinkforce schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'qalinkforce'
    AND table_name = 'inventory_items' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE qalinkforce.inventory_items ADD COLUMN deleted_at timestamptz;
    CREATE INDEX idx_qalinkforce_inventory_items_deleted_at ON qalinkforce.inventory_items(deleted_at);
  END IF;
END $$;

-- Update RLS policies for inventory_items
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "inventory_items_select_policy" ON %I.inventory_items;
      CREATE POLICY "inventory_items_select_policy" ON %I.inventory_items
        FOR SELECT TO authenticated
        USING (deleted_at IS NULL);
    ', schema_name, schema_name);
  END LOOP;
END $$;