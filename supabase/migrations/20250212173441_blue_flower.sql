-- Drop existing tables if they exist
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Recreate payment_methods table
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

-- Recreate payments table with proper foreign key
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  payment_method_id uuid REFERENCES payment_methods(id),
  amount numeric(15,2) NOT NULL,
  reference_number text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for authenticated users"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_method ON payments(payment_method_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Insert default payment methods
INSERT INTO payment_methods (name, code, description, requires_reference) VALUES
  ('Efectivo', 'CASH', 'Pago en efectivo', false),
  ('Tarjeta de Crédito', 'CREDIT_CARD', 'Pago con tarjeta de crédito', true),
  ('Transferencia Bancaria', 'BANK_TRANSFER', 'Transferencia bancaria', true),
  ('Cheque', 'CHECK', 'Pago con cheque', true)
ON CONFLICT DO NOTHING;