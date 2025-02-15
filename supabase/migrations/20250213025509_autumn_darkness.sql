-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON expense_attachments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON expense_attachments;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON expense_categories;

-- Create new policies with unique names
CREATE POLICY "expenses_select_policy"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "expenses_insert_policy"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "expenses_update_policy"
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

-- Add RLS policies for expense attachments
CREATE POLICY "attachments_select_policy"
  ON expense_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "attachments_insert_policy"
  ON expense_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Add RLS policies for expense categories
CREATE POLICY "categories_select_policy"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);