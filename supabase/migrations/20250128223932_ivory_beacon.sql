/*
  # Initial Schema Setup for Quimicinter CRM

  1. New Tables
    - `profiles`
      - Extended user profile information
      - Linked to auth.users
      - Stores role and status information
    
    - `inventory_items`
      - Product inventory tracking
      - Includes stock levels and categories
    
    - `inventory_movements`
      - Tracks all inventory changes
      - Maintains audit trail
    
    - `inventory_categories`
      - Product categorization
      - Hierarchical structure support

  2. Security
    - Enable RLS on all tables
    - Policies for role-based access
    - Admin has full access
    - Users have limited access based on role
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role user_role DEFAULT 'user',
  status user_status DEFAULT 'pending',
  phone_number text,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories for inventory items
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES inventory_categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES inventory_categories(id),
  unit_measure text NOT NULL,
  min_stock numeric NOT NULL DEFAULT 0,
  current_stock numeric NOT NULL DEFAULT 0,
  reorder_point numeric NOT NULL DEFAULT 0,
  last_restock_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Inventory movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) NOT NULL,
  movement_type movement_type NOT NULL,
  quantity numeric NOT NULL,
  previous_stock numeric NOT NULL,
  new_stock numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Categories are viewable by authenticated users"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Categories are manageable by admins and managers"
  ON inventory_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Items policies
CREATE POLICY "Items are viewable by authenticated users"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Items are manageable by admins and managers"
  ON inventory_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Movements policies
CREATE POLICY "Movements are viewable by authenticated users"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Movements can be created by authenticated users"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);