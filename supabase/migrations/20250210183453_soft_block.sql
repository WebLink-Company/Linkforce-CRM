-- Create customer categories table if not exists
CREATE TABLE IF NOT EXISTS customer_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  min_purchase_amount numeric DEFAULT 0,
  benefits text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop existing customers table if exists and recreate
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'individual',
  identification_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  commercial_name text,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  postal_code text,
  country text,
  website text,
  industry_sector text,
  contact_name text,
  contact_position text,
  contact_phone text,
  invoice_type text,
  payment_terms text,
  preferred_currency text DEFAULT 'DOP',
  credit_limit numeric DEFAULT 0,
  notes text,
  status text DEFAULT 'active',
  category_id uuid REFERENCES customer_categories(id),
  total_purchases numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT valid_type CHECK (type IN ('individual', 'corporate'))
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
CREATE POLICY "customers_select_policy"
  ON customers FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "customers_insert_policy"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "customers_update_policy"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes (removed duplicate index)
CREATE INDEX idx_customers_identification ON customers(identification_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_category ON customers(category_id);
CREATE INDEX idx_customers_type ON customers(type);

-- Insert default categories
INSERT INTO customer_categories (name, description, min_purchase_amount, benefits)
VALUES 
  ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
  ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
  ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido'])
ON CONFLICT DO NOTHING;