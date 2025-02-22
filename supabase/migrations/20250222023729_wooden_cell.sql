-- Add deleted_at column to inventory_items
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE quimicinter.inventory_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE qalinkforce.inventory_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create index on deleted_at column
CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at ON inventory_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_quimicinter_inventory_items_deleted_at ON quimicinter.inventory_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_inventory_items_deleted_at ON qalinkforce.inventory_items(deleted_at);