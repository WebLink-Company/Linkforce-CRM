-- Create tables in correct order with proper relationships
CREATE TABLE IF NOT EXISTS qalinkforce.customers (
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
  total_purchases numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT valid_type CHECK (type IN ('individual', 'corporate'))
);

CREATE TABLE IF NOT EXISTS qalinkforce.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncf text UNIQUE NOT NULL,
  customer_id uuid REFERENCES qalinkforce.customers(id) NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  discount_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  voided_at timestamptz,
  voided_reason text,
  CONSTRAINT valid_status CHECK (status IN ('draft', 'issued', 'voided')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'partial', 'paid'))
);

CREATE TABLE IF NOT EXISTS qalinkforce.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid,
  unit_measure text NOT NULL,
  min_stock numeric NOT NULL DEFAULT 0,
  current_stock numeric NOT NULL DEFAULT 0,
  reorder_point numeric NOT NULL DEFAULT 0,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  last_restock_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS qalinkforce.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES qalinkforce.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES qalinkforce.inventory_items(id),
  quantity numeric(15,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  tax_rate numeric(5,2) NOT NULL DEFAULT 18,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  discount_rate numeric(5,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qalinkforce.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  requires_reference boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qalinkforce.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES qalinkforce.invoices(id) ON DELETE CASCADE,
  payment_method_id uuid REFERENCES qalinkforce.payment_methods(id),
  amount numeric(15,2) NOT NULL,
  reference_number text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qalinkforce_customers_identification ON qalinkforce.customers(identification_number);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_customers_email ON qalinkforce.customers(email);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_invoices_customer ON qalinkforce.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_invoices_ncf ON qalinkforce.invoices(ncf);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_invoice_items_invoice ON qalinkforce.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_invoice_items_product ON qalinkforce.invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_payments_invoice ON qalinkforce.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_inventory_items_code ON qalinkforce.inventory_items(code);

-- Enable RLS
ALTER TABLE qalinkforce.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read for authenticated users"
  ON qalinkforce.customers FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Enable read for authenticated users"
  ON qalinkforce.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON qalinkforce.inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON qalinkforce.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON qalinkforce.payment_methods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON qalinkforce.payments FOR SELECT
  TO authenticated
  USING (true);

-- Insert default payment methods if they don't exist
INSERT INTO qalinkforce.payment_methods (name, code, description, requires_reference) VALUES
  ('Efectivo', 'CASH', 'Pago en efectivo', false),
  ('Tarjeta de Crédito', 'CREDIT_CARD', 'Pago con tarjeta de crédito', true),
  ('Transferencia Bancaria', 'BANK_TRANSFER', 'Transferencia bancaria', true),
  ('Cheque', 'CHECK', 'Pago con cheque', true)
ON CONFLICT (code) DO NOTHING;