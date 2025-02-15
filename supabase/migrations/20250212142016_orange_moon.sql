/*
  # Fix Inventory Items RLS Policies

  1. Changes
    - Drop existing restrictive policies
    - Create new policies that allow proper access for authenticated users
    - Ensure proper access for inventory management
  
  2. Security
    - Enable RLS on inventory_items table
    - Add policies for SELECT, INSERT, UPDATE operations
    - Maintain data integrity while allowing proper access
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Items are viewable by authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Items are manageable by admins and managers" ON inventory_items;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;