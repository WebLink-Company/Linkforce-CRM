/*
  # Financial Management Schema

  1. New Tables
    - `payment_methods` - Payment methods configuration
    - `payment_terms` - Payment terms configuration
    - `accounts` - Chart of accounts
    - `account_movements` - Account movements/transactions
    - `account_periods` - Accounting periods
    - `price_lists` - Price lists for products
    - `price_list_items` - Price list items
    - `discounts` - Discount rules
    - `payment_reminders` - Payment reminder configuration

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Create tables first
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  requires_reference boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  days integer NOT NULL,
  description text,
  discount_percentage numeric(5,2) DEFAULT 0,
  discount_days integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id uuid REFERENCES accounts(id),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) NOT NULL,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('debit', 'credit')),
  amount numeric(15,2) NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('sale', 'purchase')),
  currency text NOT NULL DEFAULT 'DOP',
  is_active boolean DEFAULT true,
  valid_from date,
  valid_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid REFERENCES price_lists(id) NOT NULL,
  product_id uuid REFERENCES inventory_items(id) NOT NULL,
  price numeric(15,2) NOT NULL,
  min_quantity numeric(15,2) DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(price_list_id, product_id)
);

CREATE TABLE IF NOT EXISTS discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('percentage', 'amount')),
  value numeric(15,2) NOT NULL,
  min_amount numeric(15,2),
  min_quantity numeric(15,2),
  customer_category_id uuid REFERENCES customer_categories(id),
  product_id uuid REFERENCES inventory_items(id),
  valid_from date,
  valid_to date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) NOT NULL,
  reminder_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('first', 'second', 'final')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  sent_at timestamptz,
  sent_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON payment_terms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON account_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON account_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON price_lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON price_list_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON discounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON payment_reminders FOR SELECT
  TO authenticated
  USING (true);

-- Insert default payment methods
INSERT INTO payment_methods (name, code, description, requires_reference) VALUES
  ('Efectivo', 'CASH', 'Pago en efectivo', false),
  ('Tarjeta de Crédito', 'CREDIT_CARD', 'Pago con tarjeta de crédito', true),
  ('Transferencia Bancaria', 'BANK_TRANSFER', 'Transferencia bancaria', true),
  ('Cheque', 'CHECK', 'Pago con cheque', true)
ON CONFLICT DO NOTHING;

-- Insert default payment terms
INSERT INTO payment_terms (name, code, days, description, discount_percentage, discount_days) VALUES
  ('Contado', 'CASH', 0, 'Pago inmediato', 0, 0),
  ('15 Días', 'NET15', 15, 'Pago a 15 días', 2, 5),
  ('30 Días', 'NET30', 30, 'Pago a 30 días', 0, 0),
  ('45 Días', 'NET45', 45, 'Pago a 45 días', 0, 0),
  ('60 Días', 'NET60', 60, 'Pago a 60 días', 0, 0)
ON CONFLICT DO NOTHING;

-- Insert default accounts
INSERT INTO accounts (code, name, type, description) VALUES
  ('1000', 'Activos', 'asset', 'Activos totales'),
  ('1100', 'Efectivo y Equivalentes', 'asset', 'Efectivo y equivalentes de efectivo'),
  ('1200', 'Cuentas por Cobrar', 'asset', 'Cuentas por cobrar comerciales'),
  ('2000', 'Pasivos', 'liability', 'Pasivos totales'),
  ('2100', 'Cuentas por Pagar', 'liability', 'Cuentas por pagar comerciales'),
  ('3000', 'Capital', 'equity', 'Capital total'),
  ('4000', 'Ingresos', 'revenue', 'Ingresos totales'),
  ('5000', 'Gastos', 'expense', 'Gastos totales')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_movements_account ON account_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_date ON account_movements(date);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product ON price_list_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_date ON payment_reminders(reminder_date);