-- Create quotes table
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  discount_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quote items table
CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "quotes_select_policy" ON quotes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "quotes_insert_policy" ON quotes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "quotes_update_policy" ON quotes
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "quote_items_select_policy" ON quote_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "quote_items_insert_policy" ON quote_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes
    WHERE id = quote_items.quote_id
    AND created_by = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_items_product ON quote_items(product_id);

-- Create sequence for quote numbers
CREATE SEQUENCE quote_number_seq START 1;

-- Create function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number = 'COT-' || LPAD(nextval('quote_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quote number generation
CREATE TRIGGER set_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION generate_quote_number();

-- Create function to convert quote to invoice
CREATE OR REPLACE FUNCTION convert_quote_to_invoice(p_quote_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_invoice_id uuid;
  v_ncf text;
BEGIN
  -- Get quote
  SELECT * INTO v_quote
  FROM quotes
  WHERE id = p_quote_id;

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
  INSERT INTO invoices (
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
    v_ncf,
    v_quote.customer_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    v_quote.subtotal,
    v_quote.tax_amount,
    v_quote.discount_amount,
    v_quote.total_amount,
    'draft',
    'pending',
    v_quote.notes,
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  -- Copy items
  INSERT INTO invoice_items (
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
    v_invoice_id,
    product_id,
    quantity,
    unit_price,
    tax_rate,
    tax_amount,
    discount_rate,
    discount_amount,
    total_amount
  FROM quote_items
  WHERE quote_id = p_quote_id;

  -- Update quote status
  UPDATE quotes SET
    status = 'converted',
    updated_at = now()
  WHERE id = p_quote_id;

  RETURN json_build_object(
    'success', true,
    'invoice_id', v_invoice_id
  );
END;
$$;