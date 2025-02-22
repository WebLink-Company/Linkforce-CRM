-- Add is_active column to expense_categories if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_categories' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE expense_categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index on is_active column
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON expense_categories(is_active);

-- Add is_active column to expense_categories in other schemas
DO $$ 
BEGIN
  -- Add to quimicinter schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'quimicinter'
    AND table_name = 'expense_categories' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE quimicinter.expense_categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    CREATE INDEX idx_quimicinter_expense_categories_is_active ON quimicinter.expense_categories(is_active);
  END IF;

  -- Add to qalinkforce schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'qalinkforce'
    AND table_name = 'expense_categories' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE qalinkforce.expense_categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    CREATE INDEX idx_qalinkforce_expense_categories_is_active ON qalinkforce.expense_categories(is_active);
  END IF;
END $$;

-- Update RLS policies for expense_categories
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Enable read for authenticated users" ON %I.expense_categories;
      CREATE POLICY "expense_categories_select_policy" ON %I.expense_categories
        FOR SELECT TO authenticated
        USING (is_active = true);
    ', schema_name, schema_name);
  END LOOP;
END $$;