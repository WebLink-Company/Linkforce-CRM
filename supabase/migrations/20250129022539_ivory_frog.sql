/*
  # Customer Management Schema

  1. New Tables
    - `customers`
      - Basic customer information
      - Contact details
      - Classification and status
    - `customer_transactions`
      - Transaction history
      - Purchase records
      - Classification updates
    - `customer_categories`
      - Category definitions
      - Benefits and rules

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users
*/

-- Create customer categories table
CREATE TABLE IF NOT EXISTS customer_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  min_purchase_amount numeric DEFAULT 0,
  benefits text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identification_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  birth_date date NOT NULL,
  category_id uuid REFERENCES customer_categories(id),
  total_purchases numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT valid_age CHECK (birth_date <= CURRENT_DATE - INTERVAL '18 years')
);

-- Create customer transactions table
CREATE TABLE IF NOT EXISTS customer_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE customer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Customers are viewable by authenticated users"
  ON customers FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Customers can be created by authenticated users"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Customers can be updated by authenticated users"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_customers_identification ON customers(identification_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_category ON customers(category_id);
CREATE INDEX idx_customer_transactions_customer ON customer_transactions(customer_id);

-- Insert default categories
INSERT INTO customer_categories (name, description, min_purchase_amount, benefits)
VALUES 
  ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
  ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
  ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido'])
ON CONFLICT DO NOTHING;