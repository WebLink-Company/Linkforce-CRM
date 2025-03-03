-- Add unique constraint on sequence_type and prefix combination
ALTER TABLE fiscal_sequences
ADD CONSTRAINT fiscal_sequences_type_prefix_key UNIQUE (sequence_type, prefix);

-- Add check constraint to ensure current_number <= end_number
ALTER TABLE fiscal_sequences
ADD CONSTRAINT fiscal_sequences_number_range_check CHECK (current_number <= end_number);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_fiscal_sequences_active_valid 
ON fiscal_sequences(sequence_type, is_active, valid_until) 
WHERE is_active = true;

-- Update generate_ncf function to be more robust
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
  v_current_date date;
BEGIN
  -- Get current date once
  v_current_date := CURRENT_DATE;
  
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
    AND valid_until >= v_current_date
  ORDER BY current_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid sequence found for type %', p_sequence_type;
  END IF;

  -- Generate NCF
  v_ncf := v_sequence.prefix || LPAD(v_sequence.current_number::text, 8, '0');

  -- Update sequence
  UPDATE fiscal_sequences
  SET 
    current_number = current_number + 1,
    updated_at = now()
  WHERE id = v_sequence.id
  AND current_number < end_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update sequence counter';
  END IF;

  RETURN v_ncf;
EXCEPTION 
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Could not acquire lock on sequence';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error generating NCF: %', SQLERRM;
    RAISE;
END;
$$;

-- Reset and reinitialize sequences with proper constraints
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