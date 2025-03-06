/*
  # Fix Supplier Code Generation Functions
  
  1. Changes
    - Create separate functions for trigger and direct code generation
    - Ensure sequence exists
    - Fix schema-based access
    - Preserve existing trigger functionality
    
  2. Security
    - Grant appropriate permissions
    - Handle schema-based access correctly
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1;

-- Create function for direct code generation (used by API)
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

-- Create trigger function for automatic code generation
CREATE OR REPLACE FUNCTION set_supplier_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  -- Only set code if not provided
  IF NEW.code IS NULL THEN
    SELECT generate_supplier_code() INTO v_code;
    NEW.code := v_code;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger if it doesn't exist (will be skipped if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_supplier_code'
    AND tgrelid = 'suppliers'::regclass
  ) THEN
    CREATE TRIGGER set_supplier_code
    BEFORE INSERT ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION set_supplier_code();
  END IF;
END
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_supplier_code() TO authenticated;
GRANT EXECUTE ON FUNCTION set_supplier_code() TO authenticated;
GRANT USAGE ON SEQUENCE supplier_code_seq TO authenticated;