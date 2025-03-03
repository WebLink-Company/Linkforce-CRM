-- Create schema-specific functions for qalinkforce schema
CREATE OR REPLACE FUNCTION qalinkforce.get_monthly_income(
  p_year integer,
  p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = qalinkforce
AS $$
DECLARE
  v_total numeric;
  v_previous_total numeric;
  v_growth_rate numeric;
BEGIN
  -- Current month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM qalinkforce.payments
  WHERE EXTRACT(YEAR FROM payment_date) = p_year
    AND EXTRACT(MONTH FROM payment_date) = p_month;

  -- Previous month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_previous_total
  FROM qalinkforce.payments
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

-- Create schema-specific functions for quimicinter schema
CREATE OR REPLACE FUNCTION quimicinter.get_monthly_income(
  p_year integer,
  p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quimicinter
AS $$
DECLARE
  v_total numeric;
  v_previous_total numeric;
  v_growth_rate numeric;
BEGIN
  -- Current month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM quimicinter.payments
  WHERE EXTRACT(YEAR FROM payment_date) = p_year
    AND EXTRACT(MONTH FROM payment_date) = p_month;

  -- Previous month total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_previous_total
  FROM quimicinter.payments
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

-- Create schema-specific functions for qalinkforce schema
CREATE OR REPLACE FUNCTION qalinkforce.get_invoice_payment_stats(
  p_year integer,
  p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = qalinkforce
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
  FROM qalinkforce.invoices
  WHERE status = 'issued'
    AND issue_date BETWEEN v_start_date AND v_end_date;

  -- Get paid invoices stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO v_paid_count, v_paid_total
  FROM qalinkforce.invoices
  WHERE status = 'issued'
    AND payment_status = 'paid'
    AND issue_date BETWEEN v_start_date AND v_end_date;

  -- Get pending invoices stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO v_pending_count, v_pending_total
  FROM qalinkforce.invoices
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

-- Create schema-specific functions for quimicinter schema
CREATE OR REPLACE FUNCTION quimicinter.get_invoice_payment_stats(
  p_year integer,
  p_month integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quimicinter
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
  FROM quimicinter.invoices
  WHERE status = 'issued'
    AND issue_date BETWEEN v_start_date AND v_end_date;

  -- Get paid invoices stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO v_paid_count, v_paid_total
  FROM quimicinter.invoices
  WHERE status = 'issued'
    AND payment_status = 'paid'
    AND issue_date BETWEEN v_start_date AND v_end_date;

  -- Get pending invoices stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO v_pending_count, v_pending_total
  FROM quimicinter.invoices
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION qalinkforce.get_monthly_income(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION quimicinter.get_monthly_income(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION qalinkforce.get_invoice_payment_stats(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION quimicinter.get_invoice_payment_stats(integer, integer) TO authenticated;