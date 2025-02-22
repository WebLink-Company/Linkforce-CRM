-- Add is_active column to accounts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE accounts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index on is_active column
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);

-- Add is_active column to accounts in other schemas
DO $$ 
BEGIN
  -- Add to quimicinter schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'quimicinter'
    AND table_name = 'accounts' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE quimicinter.accounts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    CREATE INDEX idx_quimicinter_accounts_is_active ON quimicinter.accounts(is_active);
  END IF;

  -- Add to qalinkforce schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'qalinkforce'
    AND table_name = 'accounts' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE qalinkforce.accounts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    CREATE INDEX idx_qalinkforce_accounts_is_active ON qalinkforce.accounts(is_active);
  END IF;
END $$;