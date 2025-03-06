/*
  # Fix Supplier Code Generation Function
  
  1. Changes
    - Drop and recreate supplier code generation function with correct implementation
    - Add sequence for supplier codes if it doesn't exist
    - Fix return type and parameter issues
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1;

-- Drop existing function
DROP FUNCTION IF EXISTS generate_supplier_code();

-- Recreate function with correct implementation
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_counter integer := 1;
  v_exists boolean;
BEGIN
  -- Generate initial code
  v_code := 'SUP-' || LPAD(nextval('supplier_code_seq')::text, 6, '0');
  
  -- Check if code exists
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM suppliers WHERE code = v_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    
    -- Generate new code with counter
    v_code := 'SUP-' || LPAD((currval('supplier_code_seq') + v_counter)::text, 6, '0');
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_supplier_code() TO authenticated;

-- Grant usage on sequence to authenticated users
GRANT USAGE ON SEQUENCE supplier_code_seq TO authenticated;