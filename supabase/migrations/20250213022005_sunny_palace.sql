-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON expenses;

-- Create new policies
CREATE POLICY "Expenses are viewable by authenticated users"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Expenses can be created by authenticated users"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Expenses can be updated by authenticated users"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Add code generation for expenses
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number = 'EXP-' || LPAD(nextval('expense_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS expense_number_seq START 1;

-- Create trigger
DROP TRIGGER IF EXISTS set_expense_number ON expenses;
CREATE TRIGGER set_expense_number
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION generate_expense_number();