/*
  # Fix Invoice Relationships

  1. Changes
    - Drop and recreate invoices table with proper foreign key relationships
    - Ensure all related tables have proper references
    - Add missing indexes for performance

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Recreate invoices table with proper relationships
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncf text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
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

-- Recreate invoice items table
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES inventory_items(id),
  quantity numeric(15,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  tax_rate numeric(5,2) NOT NULL DEFAULT 18,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  discount_rate numeric(5,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Recreate payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_method_id uuid NOT NULL REFERENCES payment_methods(id),
  amount numeric(15,2) NOT NULL,
  reference_number text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Invoice items are viewable by authenticated users"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoice items can be created by authenticated users"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.created_by = auth.uid()
  ));

CREATE POLICY "Payments are viewable by authenticated users"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Payments can be created by authenticated users"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_ncf ON invoices(ncf);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);