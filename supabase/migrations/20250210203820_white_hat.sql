/*
  # Add Fiscal Sequences Support

  1. New Tables
    - fiscal_sequences
      - id (uuid, primary key)
      - sequence_type (text)
      - prefix (text)
      - current_number (bigint)
      - end_number (bigint)
      - valid_until (date)
      - is_active (boolean)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Functions
    - generate_ncf: Generates sequential NCF numbers for invoices
    
  3. Security
    - Enable RLS on fiscal_sequences
    - Add policies for authenticated users
*/

-- Create fiscal sequences table if it doesn't exist
CREATE TABLE IF NOT EXISTS fiscal_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_type text NOT NULL,
  prefix text NOT NULL,
  current_number bigint NOT NULL DEFAULT 1,
  end_number bigint NOT NULL,
  valid_until date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fiscal_sequences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Fiscal sequences are viewable by authenticated users"
  ON fiscal_sequences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Fiscal sequences can be updated by authenticated users"
  ON fiscal_sequences FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to generate NCF
CREATE OR REPLACE FUNCTION generate_ncf(p_sequence_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence fiscal_sequences%ROWTYPE;
  v_ncf text;
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
END;
$$;

-- Insert initial fiscal sequence for testing
INSERT INTO fiscal_sequences (
  sequence_type,
  prefix,
  current_number,
  end_number,
  valid_until,
  is_active
) VALUES (
  'B01',
  'B01',
  1,
  99999999,
  '2025-12-31',
  true
) ON CONFLICT DO NOTHING;