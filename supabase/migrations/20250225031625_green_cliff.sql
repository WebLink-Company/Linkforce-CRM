-- Add foreign key constraint for customer categories in qalinkforce schema
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  BEGIN
    ALTER TABLE qalinkforce.customers 
    DROP CONSTRAINT IF EXISTS customers_category_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Add new constraint
  ALTER TABLE qalinkforce.customers
  ADD CONSTRAINT customers_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES qalinkforce.customer_categories(id);

  -- Drop existing constraint if it exists
  BEGIN
    ALTER TABLE quimicinter.customers 
    DROP CONSTRAINT IF EXISTS customers_category_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Add new constraint
  ALTER TABLE quimicinter.customers
  ADD CONSTRAINT customers_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES quimicinter.customer_categories(id);

  -- Insert default categories in qalinkforce schema if they don't exist
  INSERT INTO qalinkforce.customer_categories (name, description, min_purchase_amount, benefits)
  VALUES 
    ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
    ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
    ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido'])
  ON CONFLICT DO NOTHING;

  -- Insert default categories in quimicinter schema if they don't exist
  INSERT INTO quimicinter.customer_categories (name, description, min_purchase_amount, benefits)
  VALUES 
    ('Regular', 'Cliente regular', 0, ARRAY['Descuentos básicos']),
    ('VIP', 'Cliente preferencial', 100000, ARRAY['Descuentos especiales', 'Atención prioritaria']),
    ('Corporativo', 'Cliente empresarial', 500000, ARRAY['Precios mayoristas', 'Soporte dedicado', 'Crédito extendido'])
  ON CONFLICT DO NOTHING;

END $$;