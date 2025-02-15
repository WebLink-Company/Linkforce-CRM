-- Insert default expense categories if they don't exist
INSERT INTO expense_categories (code, name, description, is_active) VALUES
  ('UTIL', 'Servicios Públicos', 'Agua, electricidad, teléfono, internet, etc.', true),
  ('ALQU', 'Alquileres', 'Alquiler de locales y equipos', true),
  ('MANT', 'Mantenimiento', 'Mantenimiento de equipos e instalaciones', true),
  ('OFIC', 'Gastos de Oficina', 'Materiales y suministros de oficina', true),
  ('VIAJ', 'Viajes y Viáticos', 'Gastos de viaje y representación', true),
  ('SEGU', 'Seguros', 'Pólizas de seguro', true),
  ('IMPU', 'Impuestos', 'Impuestos y tasas', true),
  ('OTRO', 'Otros Gastos', 'Gastos varios', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

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

-- Add RLS policies for expense categories
DROP POLICY IF EXISTS "Enable read for authenticated users" ON expense_categories;
CREATE POLICY "Enable read for authenticated users"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

-- Add RLS policies for payment methods  
DROP POLICY IF EXISTS "Enable read for authenticated users" ON payment_methods;
CREATE POLICY "Enable read for authenticated users"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (true);