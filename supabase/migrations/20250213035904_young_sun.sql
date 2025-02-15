-- Drop existing trigger and function
DROP TRIGGER IF EXISTS set_supplier_code ON suppliers;
DROP FUNCTION IF EXISTS generate_supplier_code();

-- Create improved supplier code generation function
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
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
  
  NEW.code := v_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER set_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION generate_supplier_code();

-- Reset sequence if needed
SELECT setval('supplier_code_seq', (
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::integer), 0) + 1
  FROM suppliers
));