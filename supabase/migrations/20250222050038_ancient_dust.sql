-- Drop existing triggers first
DROP TRIGGER IF EXISTS handle_payment ON payments;
DROP TRIGGER IF EXISTS handle_invoice_issuance ON invoices;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_invoice_payment();
DROP FUNCTION IF EXISTS handle_invoice_issuance();

-- Create function to handle invoice payments
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
  WHERE invoice_id = NEW.invoice_id;

  v_total_paid := v_total_paid + NEW.amount;

  -- Check if payment would exceed invoice total
  IF v_total_paid > v_invoice.total_amount THEN
    RAISE EXCEPTION 'Payment amount would exceed invoice total';
  END IF;

  -- Update invoice payment status
  UPDATE invoices SET
    payment_status = CASE 
      WHEN v_total_paid >= total_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    status = CASE 
      WHEN v_total_paid >= total_amount THEN 'issued'
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

-- Create function to handle invoice issuance
CREATE OR REPLACE FUNCTION handle_invoice_issuance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accounts_receivable_id uuid;
  v_revenue_account_id uuid;
BEGIN
  -- Only handle transitions to 'issued' status
  IF NEW.status = 'issued' AND OLD.status = 'draft' THEN
    -- Get accounts
    SELECT id INTO v_accounts_receivable_id
    FROM accounts
    WHERE code = '1200'
    LIMIT 1;

    SELECT id INTO v_revenue_account_id
    FROM accounts
    WHERE code = '4000'
    LIMIT 1;

    IF v_accounts_receivable_id IS NULL OR v_revenue_account_id IS NULL THEN
      RAISE EXCEPTION 'Required accounts not found';
    END IF;

    -- Create accounting movements
    -- Debit Accounts Receivable
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
      NEW.issue_date,
      'debit',
      NEW.total_amount,
      'invoice',
      NEW.id,
      'Factura ' || NEW.ncf,
      NEW.created_by
    );

    -- Credit Revenue
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
      v_revenue_account_id,
      NEW.issue_date,
      'credit',
      NEW.total_amount,
      'invoice',
      NEW.id,
      'Factura ' || NEW.ncf,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create function to validate payment
CREATE OR REPLACE FUNCTION validate_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_total_paid numeric;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = NEW.invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Check if invoice is already paid
  IF v_invoice.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Invoice is already paid';
  END IF;

  -- Calculate total paid including new payment
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id;

  v_total_paid := v_total_paid + NEW.amount;

  -- Check if payment would exceed invoice total
  IF v_total_paid > v_invoice.total_amount THEN
    RAISE EXCEPTION 'Payment amount would exceed invoice total';
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER handle_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_invoice_payment();

CREATE TRIGGER handle_invoice_issuance
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION handle_invoice_issuance();

CREATE TRIGGER validate_payment
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment();

-- Update existing invoices that should be marked as paid
UPDATE invoices i
SET 
  payment_status = 'paid',
  updated_at = now()
WHERE status = 'issued'
AND payment_status != 'paid'
AND EXISTS (
  SELECT 1
  FROM (
    SELECT invoice_id, SUM(amount) as total_paid
    FROM payments
    GROUP BY invoice_id
  ) p
  WHERE p.invoice_id = i.id
  AND p.total_paid >= i.total_amount
);