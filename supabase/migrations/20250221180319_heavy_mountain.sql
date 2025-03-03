-- Drop existing schemas if they exist
DROP SCHEMA IF EXISTS qalinkforce CASCADE;
DROP SCHEMA IF EXISTS quimicinter CASCADE;

-- Create new schemas
CREATE SCHEMA qalinkforce;
CREATE SCHEMA quimicinter;

-- Create ENUM types in new schemas
CREATE TYPE qalinkforce.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE qalinkforce.user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE qalinkforce.movement_type AS ENUM ('in', 'out', 'adjustment');

CREATE TYPE quimicinter.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE quimicinter.user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE quimicinter.movement_type AS ENUM ('in', 'out', 'adjustment');

-- Create tables in qalinkforce schema
CREATE TABLE qalinkforce.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role qalinkforce.user_role NOT NULL DEFAULT 'user',
  status qalinkforce.user_status NOT NULL DEFAULT 'pending',
  phone_number text,
  last_login timestamptz,
  schema_name text NOT NULL DEFAULT 'qalinkforce',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE qalinkforce.payment_methods (LIKE public.payment_methods INCLUDING ALL);
CREATE TABLE qalinkforce.fiscal_sequences (LIKE public.fiscal_sequences INCLUDING ALL);
CREATE TABLE qalinkforce.payment_terms (LIKE public.payment_terms INCLUDING ALL);
CREATE TABLE qalinkforce.accounts (LIKE public.accounts INCLUDING ALL);
CREATE TABLE qalinkforce.customer_categories (LIKE public.customer_categories INCLUDING ALL);
CREATE TABLE qalinkforce.expense_categories (LIKE public.expense_categories INCLUDING ALL);
CREATE TABLE qalinkforce.supplier_categories (LIKE public.supplier_categories INCLUDING ALL);

-- Create tables in quimicinter schema
CREATE TABLE quimicinter.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role quimicinter.user_role NOT NULL DEFAULT 'user',
  status quimicinter.user_status NOT NULL DEFAULT 'pending',
  phone_number text,
  last_login timestamptz,
  schema_name text NOT NULL DEFAULT 'quimicinter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE quimicinter.payment_methods (LIKE public.payment_methods INCLUDING ALL);
CREATE TABLE quimicinter.fiscal_sequences (LIKE public.fiscal_sequences INCLUDING ALL);
CREATE TABLE quimicinter.payment_terms (LIKE public.payment_terms INCLUDING ALL);
CREATE TABLE quimicinter.accounts (LIKE public.accounts INCLUDING ALL);
CREATE TABLE quimicinter.customer_categories (LIKE public.customer_categories INCLUDING ALL);
CREATE TABLE quimicinter.expense_categories (LIKE public.expense_categories INCLUDING ALL);
CREATE TABLE quimicinter.supplier_categories (LIKE public.supplier_categories INCLUDING ALL);

-- Enable RLS on all tables
DO $$ 
DECLARE
  schema_name text;
  table_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    FOR table_name IN 
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = schema_name
    LOOP
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', schema_name, table_name);
    END LOOP;
  END LOOP;
END $$;

-- Create RLS policies
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    -- Profiles policies
    EXECUTE format('
      CREATE POLICY "profiles_read_policy" ON %I.profiles FOR SELECT TO authenticated USING (true);
      CREATE POLICY "profiles_insert_policy" ON %I.profiles FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "profiles_update_policy" ON %I.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM %I.profiles WHERE id = auth.uid() AND role = ''admin''));
    ', schema_name, schema_name, schema_name, schema_name);

    -- Payment methods policies
    EXECUTE format('
      CREATE POLICY "payment_methods_read_policy" ON %I.payment_methods FOR SELECT TO authenticated USING (true);
    ', schema_name);

    -- Other table policies...
  END LOOP;
END $$;

-- Insert default data
DO $$ 
BEGIN
  -- Payment methods
  INSERT INTO qalinkforce.payment_methods (name, code, description, requires_reference, is_active)
  VALUES 
    ('Efectivo', 'CASH', 'Pago en efectivo', false, true),
    ('Tarjeta de Crédito', 'CREDIT_CARD', 'Pago con tarjeta de crédito', true, true),
    ('Transferencia Bancaria', 'BANK_TRANSFER', 'Transferencia bancaria', true, true),
    ('Cheque', 'CHECK', 'Pago con cheque', true, true);

  INSERT INTO quimicinter.payment_methods (name, code, description, requires_reference, is_active)
  VALUES 
    ('Efectivo', 'CASH', 'Pago en efectivo', false, true),
    ('Tarjeta de Crédito', 'CREDIT_CARD', 'Pago con tarjeta de crédito', true, true),
    ('Transferencia Bancaria', 'BANK_TRANSFER', 'Transferencia bancaria', true, true),
    ('Cheque', 'CHECK', 'Pago con cheque', true, true);

  -- Fiscal sequences
  INSERT INTO qalinkforce.fiscal_sequences (sequence_type, prefix, current_number, end_number, valid_until, is_active)
  VALUES ('B01', 'B01', 1, 99999999, '2025-12-31', true);

  INSERT INTO quimicinter.fiscal_sequences (sequence_type, prefix, current_number, end_number, valid_until, is_active)
  VALUES ('B01', 'B01', 1, 99999999, '2025-12-31', true);

  -- Payment terms
  INSERT INTO qalinkforce.payment_terms (name, code, days, description, discount_percentage, discount_days, is_active)
  VALUES
    ('Contado', 'CASH', 0, 'Pago inmediato', 0, 0, true),
    ('15 Días', 'NET15', 15, 'Pago a 15 días', 2, 5, true),
    ('30 Días', 'NET30', 30, 'Pago a 30 días', 0, 0, true),
    ('45 Días', 'NET45', 45, 'Pago a 45 días', 0, 0, true),
    ('60 Días', 'NET60', 60, 'Pago a 60 días', 0, 0, true);

  INSERT INTO quimicinter.payment_terms (name, code, days, description, discount_percentage, discount_days, is_active)
  VALUES
    ('Contado', 'CASH', 0, 'Pago inmediato', 0, 0, true),
    ('15 Días', 'NET15', 15, 'Pago a 15 días', 2, 5, true),
    ('30 Días', 'NET30', 30, 'Pago a 30 días', 0, 0, true),
    ('45 Días', 'NET45', 45, 'Pago a 45 días', 0, 0, true),
    ('60 Días', 'NET60', 60, 'Pago a 60 días', 0, 0, true);

  -- Default accounts
  INSERT INTO qalinkforce.accounts (code, name, type, description)
  VALUES
    ('1000', 'Activos', 'asset', 'Activos totales'),
    ('1100', 'Efectivo y Equivalentes', 'asset', 'Efectivo y equivalentes de efectivo'),
    ('1200', 'Cuentas por Cobrar', 'asset', 'Cuentas por cobrar comerciales'),
    ('2000', 'Pasivos', 'liability', 'Pasivos totales'),
    ('2100', 'Cuentas por Pagar', 'liability', 'Cuentas por pagar comerciales'),
    ('3000', 'Capital', 'equity', 'Capital total'),
    ('4000', 'Ingresos', 'revenue', 'Ingresos totales'),
    ('5000', 'Gastos', 'expense', 'Gastos totales');

  INSERT INTO quimicinter.accounts (code, name, type, description)
  VALUES
    ('1000', 'Activos', 'asset', 'Activos totales'),
    ('1100', 'Efectivo y Equivalentes', 'asset', 'Efectivo y equivalentes de efectivo'),
    ('1200', 'Cuentas por Cobrar', 'asset', 'Cuentas por cobrar comerciales'),
    ('2000', 'Pasivos', 'liability', 'Pasivos totales'),
    ('2100', 'Cuentas por Pagar', 'liability', 'Cuentas por pagar comerciales'),
    ('3000', 'Capital', 'equity', 'Capital total'),
    ('4000', 'Ingresos', 'revenue', 'Ingresos totales'),
    ('5000', 'Gastos', 'expense', 'Gastos totales');

  -- Customer categories
  INSERT INTO qalinkforce.customer_categories (name, description, min_purchase_amount, benefits)
  VALUES 
    ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
    ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
    ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido']);

  INSERT INTO quimicinter.customer_categories (name, description, min_purchase_amount, benefits)
  VALUES 
    ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
    ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
    ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido']);

  -- Expense categories
  INSERT INTO qalinkforce.expense_categories (code, name, description, is_active)
  VALUES
    ('UTIL', 'Servicios Públicos', 'Agua, electricidad, teléfono, internet, etc.', true),
    ('ALQU', 'Alquileres', 'Alquiler de locales y equipos', true),
    ('MANT', 'Mantenimiento', 'Mantenimiento de equipos e instalaciones', true),
    ('OFIC', 'Gastos de Oficina', 'Materiales y suministros de oficina', true),
    ('VIAJ', 'Viajes y Viáticos', 'Gastos de viaje y representación', true),
    ('SEGU', 'Seguros', 'Pólizas de seguro', true),
    ('IMPU', 'Impuestos', 'Impuestos y tasas', true),
    ('OTRO', 'Otros Gastos', 'Gastos varios', true);

  INSERT INTO quimicinter.expense_categories (code, name, description, is_active)
  VALUES
    ('UTIL', 'Servicios Públicos', 'Agua, electricidad, teléfono, internet, etc.', true),
    ('ALQU', 'Alquileres', 'Alquiler de locales y equipos', true),
    ('MANT', 'Mantenimiento', 'Mantenimiento de equipos e instalaciones', true),
    ('OFIC', 'Gastos de Oficina', 'Materiales y suministros de oficina', true),
    ('VIAJ', 'Viajes y Viáticos', 'Gastos de viaje y representación', true),
    ('SEGU', 'Seguros', 'Pólizas de seguro', true),
    ('IMPU', 'Impuestos', 'Impuestos y tasas', true),
    ('OTRO', 'Otros Gastos', 'Gastos varios', true);

  -- Supplier categories
  INSERT INTO qalinkforce.supplier_categories (name, description)
  VALUES
    ('Materias Primas', 'Proveedores de materias primas químicas'),
    ('Empaques', 'Proveedores de materiales de empaque'),
    ('Equipos', 'Proveedores de equipos y maquinaria'),
    ('Servicios', 'Proveedores de servicios generales'),
    ('Transporte', 'Proveedores de servicios de transporte');

  INSERT INTO quimicinter.supplier_categories (name, description)
  VALUES
    ('Materias Primas', 'Proveedores de materias primas químicas'),
    ('Empaques', 'Proveedores de materiales de empaque'),
    ('Equipos', 'Proveedores de equipos y maquinaria'),
    ('Servicios', 'Proveedores de servicios generales'),
    ('Transporte', 'Proveedores de servicios de transporte');
END $$;

-- Grant necessary permissions
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    EXECUTE format('
      GRANT USAGE ON SCHEMA %I TO authenticated;
      GRANT USAGE ON SCHEMA %I TO anon;
      GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO authenticated;
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
  END LOOP;
END $$;