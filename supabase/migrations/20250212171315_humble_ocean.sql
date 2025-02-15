-- Create function to calculate accounts receivable
CREATE OR REPLACE FUNCTION get_accounts_receivable()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
  v_count integer;
BEGIN
  SELECT 
    COALESCE(SUM(i.total_amount - COALESCE(p.paid_amount, 0)), 0),
    COUNT(DISTINCT i.id)
  INTO v_total, v_count
  FROM invoices i
  LEFT JOIN (
    SELECT 
      invoice_id,
      SUM(amount) as paid_amount
    FROM payments
    GROUP BY invoice_id
  ) p ON p.invoice_id = i.id
  WHERE i.status = 'issued'
    AND i.payment_status IN ('pending', 'partial');

  RETURN json_build_object(
    'total', v_total,
    'count', v_count
  );
END;
$$;

-- Create function to calculate monthly income
CREATE OR REPLACE FUNCTION get_monthly_income(
  p_year integer,
  p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
  v_previous_total numeric;
  v_growth_rate numeric;
BEGIN
  -- Current month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM payments
  WHERE EXTRACT(YEAR FROM payment_date) = p_year
    AND EXTRACT(MONTH FROM payment_date) = p_month;

  -- Previous month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_previous_total
  FROM payments
  WHERE 
    CASE 
      WHEN p_month = 1 THEN
        EXTRACT(YEAR FROM payment_date) = p_year - 1 AND
        EXTRACT(MONTH FROM payment_date) = 12
      ELSE
        EXTRACT(YEAR FROM payment_date) = p_year AND
        EXTRACT(MONTH FROM payment_date) = p_month - 1
    END;

  -- Calculate growth rate
  IF v_previous_total > 0 THEN
    v_growth_rate := ((v_total - v_previous_total) / v_previous_total) * 100;
  ELSE
    v_growth_rate := 0;
  END IF;

  RETURN json_build_object(
    'total', v_total,
    'growth_rate', v_growth_rate
  );
END;
$$;

-- Create function to calculate monthly expenses
CREATE OR REPLACE FUNCTION get_monthly_expenses(
  p_year integer,
  p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
  v_previous_total numeric;
  v_growth_rate numeric;
BEGIN
  -- Current month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM account_movements
  WHERE account_id IN (
    SELECT id FROM accounts WHERE type = 'expense'
  )
  AND EXTRACT(YEAR FROM date) = p_year
  AND EXTRACT(MONTH FROM date) = p_month;

  -- Previous month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_previous_total
  FROM account_movements
  WHERE account_id IN (
    SELECT id FROM accounts WHERE type = 'expense'
  )
  AND CASE 
    WHEN p_month = 1 THEN
      EXTRACT(YEAR FROM date) = p_year - 1 AND
      EXTRACT(MONTH FROM date) = 12
    ELSE
      EXTRACT(YEAR FROM date) = p_year AND
      EXTRACT(MONTH FROM date) = p_month - 1
  END;

  -- Calculate growth rate
  IF v_previous_total > 0 THEN
    v_growth_rate := ((v_total - v_previous_total) / v_previous_total) * 100;
  ELSE
    v_growth_rate := 0;
  END IF;

  RETURN json_build_object(
    'total', v_total,
    'growth_rate', v_growth_rate
  );
END;
$$;