-- Drop existing status constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS valid_status;

-- Create new status constraint
ALTER TABLE invoices 
  ADD CONSTRAINT valid_status 
  CHECK (status IN ('draft', 'issued', 'voided', 'paid'));

-- Create same constraint in other schemas
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      ALTER TABLE %I.invoices DROP CONSTRAINT IF EXISTS valid_status;
      ALTER TABLE %I.invoices ADD CONSTRAINT valid_status CHECK (status IN (''draft'', ''issued'', ''voided'', ''paid''));
    ', schema_name, schema_name);
  END LOOP;
END $$;

-- Update payment handling function
CREATE OR REPLACE FUNCTION handle_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_total_paid numeric;
  v_accounts_receivable_id uuid;
  v_cash_account_id uuid;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = NEW.invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Calculate total paid including new payment
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id
  AND id != NEW.id; -- Exclude current payment

  v_total_paid := v_total_paid + NEW.amount;

  -- Check if payment would exceed invoice total
  IF v_total_paid > v_invoice.total_amount THEN
    RAISE EXCEPTION 'Payment amount would exceed invoice total';
  END IF;

  -- Update invoice payment status and status
  UPDATE invoices SET
    payment_status = CASE 
      WHEN v_total_paid >= total_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    status = CASE 
      WHEN v_total_paid >= total_amount THEN 'paid'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.invoice_id;

  -- Get accounts
  SELECT id INTO v_accounts_receivable_id
  FROM accounts
  WHERE code = '1200'
  LIMIT 1;

  SELECT id INTO v_cash_account_id
  FROM accounts
  WHERE code = '1100'
  LIMIT 1;

  IF v_accounts_receivable_id IS NULL OR v_cash_account_id IS NULL THEN
    RAISE EXCEPTION 'Required accounts not found';
  END IF;

  -- Create accounting movements
  -- Credit Accounts Receivable
  INSERT INTO account_movements (
    account_id,
    date,
    type,
    amount,
    reference_type,
    reference_id,
    description,
    created_by
  ) VALUES (
    v_accounts_receivable_id,
    NEW.payment_date,
    'credit',
    NEW.amount,
    'payment',
    NEW.id,
    'Pago recibido factura ' || v_invoice.ncf,
    NEW.created_by
  );

  -- Debit Cash
  INSERT INTO account_movements (
    account_id,
    date,
    type,
    amount,
    reference_type,
    reference_id,
    description,
    created_by
  ) VALUES (
    v_cash_account_id,
    NEW.payment_date,
    'debit',
    NEW.amount,
    'payment',
    NEW.id,
    'Pago recibido factura ' || v_invoice.ncf,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;