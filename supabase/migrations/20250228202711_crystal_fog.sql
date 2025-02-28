-- Drop existing function
DROP FUNCTION IF EXISTS generate_ncf(text);

-- Create improved NCF generation function with advisory lock
CREATE OR REPLACE FUNCTION generate_ncf(p_sequence_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence fiscal_sequences%ROWTYPE;
  v_ncf text;
  v_lock_key bigint;
BEGIN
  -- Generate a unique lock key based on sequence type
  v_lock_key := ('x' || substr(md5(p_sequence_type), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RAISE EXCEPTION 'Could not acquire lock for sequence type %', p_sequence_type;
  END IF;

  -- Get sequence with explicit lock
  SELECT * INTO v_sequence
  FROM fiscal_sequences
  WHERE sequence_type = p_sequence_type
    AND is_active = true
    AND current_number <= end_number
    AND valid_until >= CURRENT_DATE
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid sequence found for type %', p_sequence_type;
  END IF;

  -- Generate NCF
  v_ncf := v_sequence.prefix || LPAD(v_sequence.current_number::text, 8, '0');

  -- Update sequence
  UPDATE fiscal_sequences
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE id = v_sequence.id;

  RETURN v_ncf;
EXCEPTION 
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Could not acquire lock on sequence';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error generating NCF: %', SQLERRM;
    RAISE;
END;
$$;

-- Add unique constraint on NCF if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_ncf_key'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_ncf_key 
    UNIQUE (ncf);
  END IF;
END $$;

-- Add index on NCF for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_ncf 
ON invoices(ncf);

-- Ensure fiscal sequences exist with proper constraints
ALTER TABLE fiscal_sequences 
DROP CONSTRAINT IF EXISTS fiscal_sequences_sequence_type_key;

ALTER TABLE fiscal_sequences 
ADD CONSTRAINT fiscal_sequences_sequence_type_key 
UNIQUE (sequence_type);

-- Reset and reinitialize sequences
TRUNCATE TABLE fiscal_sequences;

INSERT INTO fiscal_sequences (
  sequence_type,
  prefix,
  current_number,
  end_number,
  valid_until,
  is_active
) VALUES 
  ('B01', 'B01', 1, 99999999, '2025-12-31', true),
  ('B02', 'B02', 1, 99999999, '2025-12-31', true),
  ('B14', 'B14', 1, 99999999, '2025-12-31', true),
  ('B15', 'B15', 1, 99999999, '2025-12-31', true);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_fiscal_sequences_type_active 
ON fiscal_sequences(sequence_type) 
WHERE is_active = true;