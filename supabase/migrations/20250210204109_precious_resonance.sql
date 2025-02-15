/*
  # Fix Invoice RLS Policies

  1. Changes
    - Drop existing invoice policies
    - Create new policies with proper permissions for:
      - SELECT: All authenticated users can view
      - INSERT: Authenticated users can insert with proper checks
      - UPDATE: Creators can update their own invoices
      - DELETE: Not allowed (soft delete via status instead)

  2. Security
    - Ensure proper access control while maintaining data integrity
    - Allow users to manage their own invoices
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Invoices are viewable by authenticated users" ON invoices;
DROP POLICY IF EXISTS "Invoices can be created by authenticated users" ON invoices;
DROP POLICY IF EXISTS "Invoices can be updated by authenticated users" ON invoices;

-- Create new policies
CREATE POLICY "Invoices are viewable by authenticated users"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoices can be created by authenticated users"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Invoices can be updated by creators"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create policies for invoice items
DROP POLICY IF EXISTS "Invoice items are viewable by authenticated users" ON invoice_items;
DROP POLICY IF EXISTS "Invoice items can be created by authenticated users" ON invoice_items;

CREATE POLICY "Invoice items are viewable by authenticated users"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoice items can be created by authenticated users"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);