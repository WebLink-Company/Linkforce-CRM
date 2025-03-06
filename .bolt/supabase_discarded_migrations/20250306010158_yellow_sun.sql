/*
  # Fix Supplier Code Generation Function
  
  1. Changes
    - Update existing function to handle schema-based access
    - Preserve trigger dependencies
    - Fix sequence handling
    
  2. Security
    - Maintain existing permissions
    - Handle schema-based access correctly
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1;

-- Update the function in place (no drop needed)
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_counter integer := 1;
  v_exists boolean;
  v_schema text;
BEGIN
  -- Get current schema
  v_schema := current_schema();
  
  -- Generate initial code
  v_code := 'SUP-' || LPAD(nextval('supplier_code_seq')::text, 6, '0');
  
  -- Check if code exists in current schema
  LOOP
    EXECUTE format('SELECT EXISTS (
      SELECT 1 FROM %I.suppliers WHERE code = $1
    )', v_schema)
    INTO v_exists
    USING v_code;
    
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
GRANT USAGE ON SEQUENCE supplier_code_seq TO authenticated;