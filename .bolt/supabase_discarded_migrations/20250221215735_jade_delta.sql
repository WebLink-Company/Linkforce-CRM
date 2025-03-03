-- Add status column to inventory_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Create index on status column
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);

-- Update RLS policies for inventory_items
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_items;
CREATE POLICY "inventory_items_select_policy" ON inventory_items
  FOR SELECT TO authenticated
  USING (status = 'active');

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
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
CREATE TABLE IF NOT EXISTS quote_items (
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

-- Create sequence for quote numbers
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

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
DROP TRIGGER IF EXISTS set_quote_number ON quotes;
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product ON quote_items(product_id);