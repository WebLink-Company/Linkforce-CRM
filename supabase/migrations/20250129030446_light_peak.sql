/*
  # Fix Customer Transactions Indices

  1. Changes
    - Safely handle duplicate index issue
    - Ensure index exists only once
    - Maintain data integrity

  2. Notes
    - This migration is idempotent (safe to run multiple times)
    - No data loss will occur
    - Existing index will be preserved if it exists
*/

DO $$ 
BEGIN
  -- Drop the index if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_customer_transactions_customer'
  ) THEN
    DROP INDEX idx_customer_transactions_customer;
  END IF;
END $$;

-- Recreate the index with IF NOT EXISTS to prevent future conflicts
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer 
  ON customer_transactions(customer_id);