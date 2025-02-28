-- Drop existing sequence_type constraint if it exists
ALTER TABLE fiscal_sequences 
DROP CONSTRAINT IF EXISTS fiscal_sequences_sequence_type_key;

-- Add unique constraint on sequence_type
ALTER TABLE fiscal_sequences 
ADD CONSTRAINT fiscal_sequences_sequence_type_key 
UNIQUE (sequence_type);

-- Fix NCF generation function
CREATE OR REPLACE FUNCTION generate_ncf(p_sequence_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence fiscal_sequences%ROWTYPE;
  v_ncf text;
  v_retries integer := 0;
  v_max_retries constant integer := 3;
BEGIN
  WHILE v_retries < v_max_retries LOOP
    -- Get and lock the sequence
    SELECT * INTO v_sequence
    FROM fiscal_sequences
    WHERE sequence_type = p_sequence_type
      AND is_active = true
      AND current_number <= end_number
      AND valid_until >= CURRENT_DATE
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      -- Generate NCF
      v_ncf := v_sequence.prefix || LPAD(v_sequence.current_number::text, 8, '0');

      -- Update sequence
      UPDATE fiscal_sequences
      SET current_number = current_number + 1,
          updated_at = now()
      WHERE id = v_sequence.id;

      RETURN v_ncf;
    END IF;

    v_retries := v_retries + 1;
    -- Small delay before retry
    PERFORM pg_sleep(0.1);
  END LOOP;

  RAISE EXCEPTION 'No valid sequence found for type % after % retries', p_sequence_type, v_max_retries;
END;
$$;

-- Delete existing sequences to avoid conflicts
DELETE FROM fiscal_sequences;

-- Insert default sequences
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