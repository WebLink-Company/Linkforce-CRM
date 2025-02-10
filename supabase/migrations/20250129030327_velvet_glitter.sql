/*
  # Fix Customer Transactions Index

  1. Changes
    - Drop existing index if it exists
    - Recreate index safely
    - Ensure no duplicate indices

  2. Security
    - No changes to existing security policies
*/

-- Drop the index if it exists (this prevents the duplicate index error)
DROP INDEX IF EXISTS idx_customer_transactions_customer;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer 
  ON customer_transactions(customer_id);