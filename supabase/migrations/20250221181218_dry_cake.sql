-- Create missing tables in qalinkforce schema
CREATE TABLE qalinkforce.customers (LIKE public.customers INCLUDING ALL);
CREATE TABLE qalinkforce.customer_transactions (LIKE public.customer_transactions INCLUDING ALL);
CREATE TABLE qalinkforce.invoices (LIKE public.invoices INCLUDING ALL);
CREATE TABLE qalinkforce.invoice_items (LIKE public.invoice_items INCLUDING ALL);
CREATE TABLE qalinkforce.payments (LIKE public.payments INCLUDING ALL);
CREATE TABLE qalinkforce.account_movements (LIKE public.account_movements INCLUDING ALL);
CREATE TABLE qalinkforce.account_periods (LIKE public.account_periods INCLUDING ALL);
CREATE TABLE qalinkforce.price_lists (LIKE public.price_lists INCLUDING ALL);
CREATE TABLE qalinkforce.price_list_items (LIKE public.price_list_items INCLUDING ALL);
CREATE TABLE qalinkforce.discounts (LIKE public.discounts INCLUDING ALL);
CREATE TABLE qalinkforce.payment_reminders (LIKE public.payment_reminders INCLUDING ALL);
CREATE TABLE qalinkforce.suppliers (LIKE public.suppliers INCLUDING ALL);
CREATE TABLE qalinkforce.supplier_categories_suppliers (LIKE public.supplier_categories_suppliers INCLUDING ALL);
CREATE TABLE qalinkforce.purchase_orders (LIKE public.purchase_orders INCLUDING ALL);
CREATE TABLE qalinkforce.purchase_order_items (LIKE public.purchase_order_items INCLUDING ALL);
CREATE TABLE qalinkforce.supplier_invoices (LIKE public.supplier_invoices INCLUDING ALL);
CREATE TABLE qalinkforce.supplier_invoice_items (LIKE public.supplier_invoice_items INCLUDING ALL);
CREATE TABLE qalinkforce.supplier_payments (LIKE public.supplier_payments INCLUDING ALL);
CREATE TABLE qalinkforce.expenses (LIKE public.expenses INCLUDING ALL);
CREATE TABLE qalinkforce.expense_attachments (LIKE public.expense_attachments INCLUDING ALL);
CREATE TABLE qalinkforce.purchase_products (LIKE public.purchase_products INCLUDING ALL);
CREATE TABLE qalinkforce.supplier_product_prices (LIKE public.supplier_product_prices INCLUDING ALL);
CREATE TABLE qalinkforce.raw_materials (LIKE public.raw_materials INCLUDING ALL);
CREATE TABLE qalinkforce.raw_material_lots (LIKE public.raw_material_lots INCLUDING ALL);
CREATE TABLE qalinkforce.raw_material_movements (LIKE public.raw_material_movements INCLUDING ALL);
CREATE TABLE qalinkforce.raw_material_quality_controls (LIKE public.raw_material_quality_controls INCLUDING ALL);
CREATE TABLE qalinkforce.raw_material_documents (LIKE public.raw_material_documents INCLUDING ALL);
CREATE TABLE qalinkforce.inventory_items (LIKE public.inventory_items INCLUDING ALL);
CREATE TABLE qalinkforce.inventory_categories (LIKE public.inventory_categories INCLUDING ALL);
CREATE TABLE qalinkforce.inventory_movements (LIKE public.inventory_movements INCLUDING ALL);

-- Create missing tables in quimicinter schema
CREATE TABLE quimicinter.customers (LIKE public.customers INCLUDING ALL);
CREATE TABLE quimicinter.customer_transactions (LIKE public.customer_transactions INCLUDING ALL);
CREATE TABLE quimicinter.invoices (LIKE public.invoices INCLUDING ALL);
CREATE TABLE quimicinter.invoice_items (LIKE public.invoice_items INCLUDING ALL);
CREATE TABLE quimicinter.payments (LIKE public.payments INCLUDING ALL);
CREATE TABLE quimicinter.account_movements (LIKE public.account_movements INCLUDING ALL);
CREATE TABLE quimicinter.account_periods (LIKE public.account_periods INCLUDING ALL);
CREATE TABLE quimicinter.price_lists (LIKE public.price_lists INCLUDING ALL);
CREATE TABLE quimicinter.price_list_items (LIKE public.price_list_items INCLUDING ALL);
CREATE TABLE quimicinter.discounts (LIKE public.discounts INCLUDING ALL);
CREATE TABLE quimicinter.payment_reminders (LIKE public.payment_reminders INCLUDING ALL);
CREATE TABLE quimicinter.suppliers (LIKE public.suppliers INCLUDING ALL);
CREATE TABLE quimicinter.supplier_categories_suppliers (LIKE public.supplier_categories_suppliers INCLUDING ALL);
CREATE TABLE quimicinter.purchase_orders (LIKE public.purchase_orders INCLUDING ALL);
CREATE TABLE quimicinter.purchase_order_items (LIKE public.purchase_order_items INCLUDING ALL);
CREATE TABLE quimicinter.supplier_invoices (LIKE public.supplier_invoices INCLUDING ALL);
CREATE TABLE quimicinter.supplier_invoice_items (LIKE public.supplier_invoice_items INCLUDING ALL);
CREATE TABLE quimicinter.supplier_payments (LIKE public.supplier_payments INCLUDING ALL);
CREATE TABLE quimicinter.expenses (LIKE public.expenses INCLUDING ALL);
CREATE TABLE quimicinter.expense_attachments (LIKE public.expense_attachments INCLUDING ALL);
CREATE TABLE quimicinter.purchase_products (LIKE public.purchase_products INCLUDING ALL);
CREATE TABLE quimicinter.supplier_product_prices (LIKE public.supplier_product_prices INCLUDING ALL);
CREATE TABLE quimicinter.raw_materials (LIKE public.raw_materials INCLUDING ALL);
CREATE TABLE quimicinter.raw_material_lots (LIKE public.raw_material_lots INCLUDING ALL);
CREATE TABLE quimicinter.raw_material_movements (LIKE public.raw_material_movements INCLUDING ALL);
CREATE TABLE quimicinter.raw_material_quality_controls (LIKE public.raw_material_quality_controls INCLUDING ALL);
CREATE TABLE quimicinter.raw_material_documents (LIKE public.raw_material_documents INCLUDING ALL);
CREATE TABLE quimicinter.inventory_items (LIKE public.inventory_items INCLUDING ALL);
CREATE TABLE quimicinter.inventory_categories (LIKE public.inventory_categories INCLUDING ALL);
CREATE TABLE quimicinter.inventory_movements (LIKE public.inventory_movements INCLUDING ALL);

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

-- Create RLS policies for new tables
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    -- Customers policies
    EXECUTE format('
      CREATE POLICY "customers_select_policy" ON %I.customers FOR SELECT TO authenticated USING (deleted_at IS NULL);
      CREATE POLICY "customers_insert_policy" ON %I.customers FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "customers_update_policy" ON %I.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    ', schema_name, schema_name, schema_name);

    -- Invoices policies
    EXECUTE format('
      CREATE POLICY "invoices_select_policy" ON %I.invoices FOR SELECT TO authenticated USING (true);
      CREATE POLICY "invoices_insert_policy" ON %I.invoices FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "invoices_update_policy" ON %I.invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    ', schema_name, schema_name, schema_name);

    -- Inventory policies
    EXECUTE format('
      CREATE POLICY "inventory_select_policy" ON %I.inventory_items FOR SELECT TO authenticated USING (true);
      CREATE POLICY "inventory_insert_policy" ON %I.inventory_items FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "inventory_update_policy" ON %I.inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    ', schema_name, schema_name, schema_name);

    -- Suppliers policies
    EXECUTE format('
      CREATE POLICY "suppliers_select_policy" ON %I.suppliers FOR SELECT TO authenticated USING (deleted_at IS NULL);
      CREATE POLICY "suppliers_insert_policy" ON %I.suppliers FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "suppliers_update_policy" ON %I.suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    ', schema_name, schema_name, schema_name);

    -- Expenses policies
    EXECUTE format('
      CREATE POLICY "expenses_select_policy" ON %I.expenses FOR SELECT TO authenticated USING (true);
      CREATE POLICY "expenses_insert_policy" ON %I.expenses FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "expenses_update_policy" ON %I.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    ', schema_name, schema_name, schema_name);

    -- Raw materials policies
    EXECUTE format('
      CREATE POLICY "raw_materials_select_policy" ON %I.raw_materials FOR SELECT TO authenticated USING (deleted_at IS NULL);
      CREATE POLICY "raw_materials_insert_policy" ON %I.raw_materials FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "raw_materials_update_policy" ON %I.raw_materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    ', schema_name, schema_name, schema_name);
  END LOOP;
END $$;

-- Copy functions and triggers
DO $$ 
DECLARE
  schema_name text;
  func record;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    -- Clone functions
    FOR func IN
      SELECT 
        proname,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND proname NOT LIKE 'handle_%'  -- Skip auth handling functions
      AND proname NOT LIKE 'validate_%' -- Skip validation functions
    LOOP
      BEGIN
        EXECUTE replace(func.definition, 'public', schema_name);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create function % in schema %: %', func.proname, schema_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Create sequences
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    -- Create sequences
    EXECUTE format('
      CREATE SEQUENCE IF NOT EXISTS %I.supplier_code_seq;
      CREATE SEQUENCE IF NOT EXISTS %I.purchase_order_number_seq;
      CREATE SEQUENCE IF NOT EXISTS %I.expense_number_seq;
      CREATE SEQUENCE IF NOT EXISTS %I.purchase_product_code_seq;
    ', schema_name, schema_name, schema_name, schema_name);
  END LOOP;
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