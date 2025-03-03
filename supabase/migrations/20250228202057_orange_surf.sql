-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_ncf(text);

-- Create improved NCF generation function
CREATE OR REPLACE FUNCTION generate_ncf(p_sequence_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence fiscal_sequences%ROWTYPE;
  v_ncf text;
  v_retries integer := 0;
  v_max_retries constant integer := 3;
BEGIN
  -- Get and lock the sequence
  SELECT * INTO v_sequence
  FROM fiscal_sequences
  WHERE sequence_type = p_sequence_type
    AND is_active = true
    AND current_number <= end_number
    AND valid_until >= CURRENT_DATE
  FOR UPDATE;

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
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE NOTICE 'Error generating NCF: %', SQLERRM;
  RAISE;
END;
$$;

-- Ensure fiscal sequences exist
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
  ('B15', 'B15', 1, 99999999, '2025-12-31', true)
ON CONFLICT (sequence_type) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  valid_until = EXCLUDED.valid_until
WHERE fiscal_sequences.valid_until < EXCLUDED.valid_until;