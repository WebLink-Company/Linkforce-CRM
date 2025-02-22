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

  -- Update invoice payment status
  UPDATE invoices SET
    payment_status = CASE 
      WHEN v_total_paid >= total_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending'
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

-- Create trigger for payment handling
DROP TRIGGER IF EXISTS handle_payment ON payments;
CREATE TRIGGER handle_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_invoice_payment();

-- Create function to handle invoice issuance accounting
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

-- Create trigger for invoice issuance
DROP TRIGGER IF EXISTS handle_invoice_issuance ON invoices;
CREATE TRIGGER handle_invoice_issuance
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION handle_invoice_issuance();

-- Create function to get invoice payment stats
CREATE OR REPLACE FUNCTION get_invoice_payment_stats(
  p_year integer,
  p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_issued_count integer;
  v_issued_total numeric;
  v_paid_count integer;
  v_paid_total numeric;
  v_pending_count integer;
  v_pending_total numeric;
BEGIN
  -- Set date range
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := v_start_date + interval '1 month' - interval '1 day';

  -- Get issued invoices stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO v_issued_count, v_issued_total
  FROM invoices
  WHERE status = 'issued'
    AND issue_date BETWEEN v_start_date AND v_end_date;

  -- Get paid invoices stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO v_paid_count, v_paid_total
  FROM invoices
  WHERE status = 'issued'
    AND payment_status = 'paid'
    AND issue_date BETWEEN v_start_date AND v_end_date;

  -- Get pending invoices stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO v_pending_count, v_pending_total
  FROM invoices
  WHERE status = 'issued'
    AND payment_status IN ('pending', 'partial')
    AND issue_date BETWEEN v_start_date AND v_end_date;

  RETURN json_build_object(
    'issued', json_build_object(
      'count', v_issued_count,
      'total', v_issued_total
    ),
    'paid', json_build_object(
      'count', v_paid_count,
      'total', v_paid_total
    ),
    'pending', json_build_object(
      'count', v_pending_count,
      'total', v_pending_total
    )
  );
END;
$$;