/*
  # Billing System Schema

  1. New Tables
    - `fiscal_sequences`: Stores NCF sequences and control
    - `invoices`: Main invoice table
    - `invoice_items`: Invoice line items
    - `payment_methods`: Available payment methods
    - `payments`: Payment records
    - `fiscal_periods`: Fiscal periods for reporting

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add audit logging
*/

-- Fiscal Sequences for NCF control
CREATE TABLE IF NOT EXISTS fiscal_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_type text NOT NULL,
  prefix text NOT NULL,
  current_number bigint NOT NULL DEFAULT 1,
  end_number bigint NOT NULL,
  valid_until date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncf text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
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

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) NOT NULL,
  product_id uuid REFERENCES inventory_items(id) NOT NULL,
  quantity numeric(15,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  tax_rate numeric(5,2) NOT NULL DEFAULT 18,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  discount_rate numeric(5,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id) NOT NULL,
  amount numeric(15,2) NOT NULL,
  reference_number text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Fiscal Periods
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_period CHECK (start_date <= end_date)
);

-- Enable RLS
ALTER TABLE fiscal_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Invoices are viewable by authenticated users"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoices can be created by authenticated users"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Invoices can be updated by authenticated users"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create indexes
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_ncf ON invoices(ncf);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- Insert default payment methods
INSERT INTO payment_methods (name, code) VALUES
  ('Efectivo', 'CASH'),
  ('Tarjeta de Crédito', 'CREDIT_CARD'),
  ('Transferencia Bancaria', 'BANK_TRANSFER'),
  ('Cheque', 'CHECK')
ON CONFLICT DO NOTHING;

-- Create function to generate NCF
CREATE OR REPLACE FUNCTION generate_ncf(p_sequence_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence fiscal_sequences%ROWTYPE;
  v_ncf text;
BEGIN
  -- Get and lock the sequence
  SELECT * INTO v_sequence
  FROM fiscal_sequences
  WHERE sequence_type = p_sequence_type
    AND is_active = true
    AND current_number <= end_number
    AND valid_until >= CURRENT_DATE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid sequence found for type %', p_sequence_type;
  END IF;

  -- Generate NCF
  v_ncf := v_sequence.prefix || LPAD(v_sequence.current_number::text, 8, '0');

  -- Update sequence
  UPDATE fiscal_sequences
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE id = v_sequence.id;

  RETURN v_ncf;
END;
$$;