-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON payment_methods;

-- Create new policy
CREATE POLICY "payment_methods_read_policy"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Insert default payment methods if they don't exist
INSERT INTO payment_methods (name, code, description, requires_reference, is_active) VALUES
  ('Efectivo', 'CASH', 'Pago en efectivo', false, true),
  ('Tarjeta de Crédito', 'CREDIT_CARD', 'Pago con tarjeta de crédito', true, true),
  ('Transferencia Bancaria', 'BANK_TRANSFER', 'Transferencia bancaria', true, true),
  ('Cheque', 'CHECK', 'Pago con cheque', true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  requires_reference = EXCLUDED.requires_reference,
  is_active = EXCLUDED.is_active;