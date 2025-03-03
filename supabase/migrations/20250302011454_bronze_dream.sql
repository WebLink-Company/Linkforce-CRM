-- Drop existing policies first
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    -- Drop existing policies if they exist
    EXECUTE format('
      DROP POLICY IF EXISTS quotes_select_policy ON %I.quotes;
      DROP POLICY IF EXISTS quotes_insert_policy ON %I.quotes;
      DROP POLICY IF EXISTS quotes_update_policy ON %I.quotes;
      DROP POLICY IF EXISTS quote_items_select_policy ON %I.quote_items;
      DROP POLICY IF EXISTS quote_items_insert_policy ON %I.quote_items;
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
  END LOOP;
END $$;

-- Create or update tables in each schema
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    -- Create quotes table if it doesn't exist
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.quotes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        number text UNIQUE NOT NULL,
        customer_id uuid NOT NULL,
        issue_date date NOT NULL DEFAULT CURRENT_DATE,
        valid_until date NOT NULL,
        subtotal numeric(15,2) NOT NULL DEFAULT 0,
        tax_amount numeric(15,2) NOT NULL DEFAULT 0,
        discount_amount numeric(15,2) NOT NULL DEFAULT 0,
        total_amount numeric(15,2) NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT ''pending'' CHECK (status IN (''pending'', ''approved'', ''rejected'', ''converted'')),
        notes text,
        created_by uuid REFERENCES auth.users(id),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES %I.customers(id)
      )', schema_name, schema_name);

    -- Create quote items table if it doesn't exist
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.quote_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(15,2) NOT NULL,
        unit_price numeric(15,2) NOT NULL,
        tax_rate numeric(5,2) NOT NULL DEFAULT 18,
        tax_amount numeric(15,2) NOT NULL DEFAULT 0,
        discount_rate numeric(5,2) DEFAULT 0,
        discount_amount numeric(15,2) DEFAULT 0,
        total_amount numeric(15,2) NOT NULL,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES %I.quotes(id) ON DELETE CASCADE,
        CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES %I.inventory_items(id)
      )', schema_name, schema_name, schema_name);

    -- Create sequence if it doesn't exist
    EXECUTE format('
      CREATE SEQUENCE IF NOT EXISTS %I.quote_number_seq START 1;
    ', schema_name);

    -- Enable RLS
    EXECUTE format('
      ALTER TABLE %I.quotes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE %I.quote_items ENABLE ROW LEVEL SECURITY;
    ', schema_name, schema_name);

    -- Create new policies
    EXECUTE format('
      CREATE POLICY quotes_select_policy ON %I.quotes
        FOR SELECT TO authenticated
        USING (true);

      CREATE POLICY quotes_insert_policy ON %I.quotes
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY quotes_update_policy ON %I.quotes
        FOR UPDATE TO authenticated
        USING (auth.uid() = created_by)
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY quote_items_select_policy ON %I.quote_items
        FOR SELECT TO authenticated
        USING (true);

      CREATE POLICY quote_items_insert_policy ON %I.quote_items
        FOR INSERT TO authenticated
        WITH CHECK (EXISTS (
          SELECT 1 FROM %I.quotes
          WHERE id = quote_items.quote_id
          AND created_by = auth.uid()
        ));
    ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);

    -- Create indexes
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_quotes_customer ON %I.quotes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_%I_quotes_status ON %I.quotes(status);
      CREATE INDEX IF NOT EXISTS idx_%I_quote_items_quote ON %I.quote_items(quote_id);
      CREATE INDEX IF NOT EXISTS idx_%I_quote_items_product ON %I.quote_items(product_id);
    ', 
      schema_name, schema_name,
      schema_name, schema_name,
      schema_name, schema_name,
      schema_name, schema_name
    );
  END LOOP;
END $$;

-- Create or replace quote number generation function
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  v_schema text;
BEGIN
  -- Get current schema
  v_schema := current_schema();
  
  -- Generate quote number if not provided
  IF NEW.number IS NULL THEN
    EXECUTE format('
      SELECT ''COT-'' || LPAD(nextval(''%I.quote_number_seq'')::text, 6, ''0'')
    ', v_schema) INTO NEW.number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace quote number triggers
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_quote_number ON %I.quotes;
      CREATE TRIGGER set_quote_number
        BEFORE INSERT ON %I.quotes
        FOR EACH ROW
        EXECUTE FUNCTION generate_quote_number();
    ', schema_name, schema_name);
  END LOOP;
END $$;

-- Create or replace quote conversion function
CREATE OR REPLACE FUNCTION convert_quote_to_invoice(p_quote_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_invoice_id uuid;
  v_ncf text;
  v_schema text;
BEGIN
  -- Get current schema
  v_schema := current_schema();

  -- Get quote
  EXECUTE format('
    SELECT * FROM %I.quotes WHERE id = $1
  ', v_schema) INTO v_quote USING p_quote_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quote not found'
    );
  END IF;

  -- Check if quote can be converted
  IF v_quote.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only pending quotes can be converted to invoices'
    );
  END IF;

  -- Get NCF
  SELECT generate_ncf('B01') INTO v_ncf;

  -- Create invoice
  EXECUTE format('
    INSERT INTO %I.invoices (
      ncf,
      customer_id,
      issue_date,
      due_date,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      status,
      payment_status,
      notes,
      created_by
    ) VALUES (
      $1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL ''30 days'',
      $3, $4, $5, $6, ''draft'', ''pending'', $7, auth.uid()
    )
    RETURNING id
  ', v_schema) 
  INTO v_invoice_id
  USING 
    v_ncf,
    v_quote.customer_id,
    v_quote.subtotal,
    v_quote.tax_amount,
    v_quote.discount_amount,
    v_quote.total_amount,
    v_quote.notes;

  -- Copy items
  EXECUTE format('
    INSERT INTO %I.invoice_items (
      invoice_id,
      product_id,
      quantity,
      unit_price,
      tax_rate,
      tax_amount,
      discount_rate,
      discount_amount,
      total_amount
    )
    SELECT 
      $1,
      product_id,
      quantity,
      unit_price,
      tax_rate,
      tax_amount,
      discount_rate,
      discount_amount,
      total_amount
    FROM %I.quote_items
    WHERE quote_id = $2
  ', v_schema, v_schema)
  USING v_invoice_id, p_quote_id;

  -- Update quote status
  EXECUTE format('
    UPDATE %I.quotes SET
      status = ''converted'',
      updated_at = now()
    WHERE id = $1
  ', v_schema)
  USING p_quote_id;

  RETURN json_build_object(
    'success', true,
    'invoice_id', v_invoice_id
  );
END;
$$;

-- Grant necessary permissions
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      GRANT USAGE ON SCHEMA %I TO authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA %I TO authenticated;
    ', schema_name, schema_name, schema_name);
  END LOOP;
END $$;