-- Schema Sync Migration
-- This migration synchronizes all schemas with their required structure

-- Create required types in each schema
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    -- Create schema if it doesn't exist
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Create types if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = schema_name AND t.typname = 'user_role') THEN
      EXECUTE format('CREATE TYPE %I.user_role AS ENUM (''admin'', ''manager'', ''user'')', schema_name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = schema_name AND t.typname = 'user_status') THEN
      EXECUTE format('CREATE TYPE %I.user_status AS ENUM (''active'', ''inactive'', ''pending'')', schema_name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = schema_name AND t.typname = 'movement_type') THEN
      EXECUTE format('CREATE TYPE %I.movement_type AS ENUM (''in'', ''out'', ''adjustment'')', schema_name);
    END IF;
  END LOOP;
END $$;

-- Copy tables and structure
DO $$ 
DECLARE
  source_schema text := 'public';
  target_schema text;
  table_record record;
  column_record record;
  constraint_record record;
  index_record record;
BEGIN
  FOR target_schema IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    -- Copy each table
    FOR table_record IN 
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = source_schema
    LOOP
      -- Create table if it doesn't exist
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.%I (LIKE %I.%I INCLUDING ALL)',
        target_schema, table_record.tablename,
        source_schema, table_record.tablename
      );

      -- Enable RLS
      EXECUTE format('
        ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
        target_schema, table_record.tablename
      );

      -- Create standard RLS policies
      EXECUTE format('
        DROP POLICY IF EXISTS "Enable read for authenticated users" ON %I.%I;
        CREATE POLICY "Enable read for authenticated users" ON %I.%I
          FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON %I.%I;
        CREATE POLICY "Enable insert for authenticated users" ON %I.%I
          FOR INSERT TO authenticated WITH CHECK (true);
        
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON %I.%I;
        CREATE POLICY "Enable update for authenticated users" ON %I.%I
          FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      ', 
        target_schema, table_record.tablename,
        target_schema, table_record.tablename,
        target_schema, table_record.tablename,
        target_schema, table_record.tablename,
        target_schema, table_record.tablename,
        target_schema, table_record.tablename
      );
    END LOOP;
  END LOOP;
END $$;

-- Copy functions
DO $$ 
DECLARE
  source_schema text := 'public';
  target_schema text;
  function_record record;
BEGIN
  FOR target_schema IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    FOR function_record IN
      SELECT 
        p.proname as name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = source_schema
      AND p.proname NOT LIKE 'sync_%'
      AND p.proname NOT LIKE 'backup_%'
      AND p.proname NOT LIKE 'restore_%'
    LOOP
      BEGIN
        EXECUTE replace(
          function_record.definition,
          source_schema,
          target_schema
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create function % in schema %: %', 
          function_record.name, target_schema, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Copy triggers
DO $$ 
DECLARE
  source_schema text := 'public';
  target_schema text;
  trigger_record record;
BEGIN
  FOR target_schema IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    FOR trigger_record IN
      SELECT 
        tgname as name,
        tgrelid::regclass::text as table_name,
        pg_get_triggerdef(oid) as definition
      FROM pg_trigger
      WHERE tgrelid::regclass::text LIKE source_schema || '.%'
    LOOP
      BEGIN
        EXECUTE replace(
          trigger_record.definition,
          source_schema,
          target_schema
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create trigger % in schema %: %', 
          trigger_record.name, target_schema, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Grant permissions
DO $$ 
DECLARE
  target_schema text;
BEGIN
  FOR target_schema IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    EXECUTE format('
      GRANT USAGE ON SCHEMA %I TO authenticated;
      GRANT USAGE ON SCHEMA %I TO anon;
      GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO authenticated;
    ', target_schema, target_schema, target_schema, target_schema, target_schema);
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
    ('Cheque', 'CHECK', 'Pago con cheque', true, true)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO quimicinter.payment_methods (name, code, description, requires_reference, is_active)
  VALUES 
    ('Efectivo', 'CASH', 'Pago en efectivo', false, true),
    ('Tarjeta de Crédito', 'CREDIT_CARD', 'Pago con tarjeta de crédito', true, true),
    ('Transferencia Bancaria', 'BANK_TRANSFER', 'Transferencia bancaria', true, true),
    ('Cheque', 'CHECK', 'Pago con cheque', true, true)
  ON CONFLICT (code) DO NOTHING;

  -- Fiscal sequences
  INSERT INTO qalinkforce.fiscal_sequences (sequence_type, prefix, current_number, end_number, valid_until, is_active)
  VALUES ('B01', 'B01', 1, 99999999, '2025-12-31', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO quimicinter.fiscal_sequences (sequence_type, prefix, current_number, end_number, valid_until, is_active)
  VALUES ('B01', 'B01', 1, 99999999, '2025-12-31', true)
  ON CONFLICT DO NOTHING;

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
    ('5000', 'Gastos', 'expense', 'Gastos totales')
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO quimicinter.accounts (code, name, type, description)
  VALUES
    ('1000', 'Activos', 'asset', 'Activos totales'),
    ('1100', 'Efectivo y Equivalentes', 'asset', 'Efectivo y equivalentes de efectivo'),
    ('1200', 'Cuentas por Cobrar', 'asset', 'Cuentas por cobrar comerciales'),
    ('2000', 'Pasivos', 'liability', 'Pasivos totales'),
    ('2100', 'Cuentas por Pagar', 'liability', 'Cuentas por pagar comerciales'),
    ('3000', 'Capital', 'equity', 'Capital total'),
    ('4000', 'Ingresos', 'revenue', 'Ingresos totales'),
    ('5000', 'Gastos', 'expense', 'Gastos totales')
  ON CONFLICT (code) DO NOTHING;

  -- Customer categories
  INSERT INTO qalinkforce.customer_categories (name, description, min_purchase_amount, benefits)
  VALUES 
    ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
    ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
    ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido'])
  ON CONFLICT DO NOTHING;

  INSERT INTO quimicinter.customer_categories (name, description, min_purchase_amount, benefits)
  VALUES 
    ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
    ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
    ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido'])
  ON CONFLICT DO NOTHING;

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
    ('OTRO', 'Otros Gastos', 'Gastos varios', true)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO quimicinter.expense_categories (code, name, description, is_active)
  VALUES
    ('UTIL', 'Servicios Públicos', 'Agua, electricidad, teléfono, internet, etc.', true),
    ('ALQU', 'Alquileres', 'Alquiler de locales y equipos', true),
    ('MANT', 'Mantenimiento', 'Mantenimiento de equipos e instalaciones', true),
    ('OFIC', 'Gastos de Oficina', 'Materiales y suministros de oficina', true),
    ('VIAJ', 'Viajes y Viáticos', 'Gastos de viaje y representación', true),
    ('SEGU', 'Seguros', 'Pólizas de seguro', true),
    ('IMPU', 'Impuestos', 'Impuestos y tasas', true),
    ('OTRO', 'Otros Gastos', 'Gastos varios', true)
  ON CONFLICT (code) DO NOTHING;

  -- Supplier categories
  INSERT INTO qalinkforce.supplier_categories (name, description)
  VALUES
    ('Materias Primas', 'Proveedores de materias primas químicas'),
    ('Empaques', 'Proveedores de materiales de empaque'),
    ('Equipos', 'Proveedores de equipos y maquinaria'),
    ('Servicios', 'Proveedores de servicios generales'),
    ('Transporte', 'Proveedores de servicios de transporte')
  ON CONFLICT DO NOTHING;

  INSERT INTO quimicinter.supplier_categories (name, description)
  VALUES
    ('Materias Primas', 'Proveedores de materias primas químicas'),
    ('Empaques', 'Proveedores de materiales de empaque'),
    ('Equipos', 'Proveedores de equipos y maquinaria'),
    ('Servicios', 'Proveedores de servicios generales'),
    ('Transporte', 'Proveedores de servicios de transporte')
  ON CONFLICT DO NOTHING;
END $$;