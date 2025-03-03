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

  -- Get issued invoices stats (excluding drafts and voided)
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

-- Create same function in other schemas
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.get_invoice_payment_stats(
        p_year integer,
        p_month integer
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
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
        v_end_date := v_start_date + interval ''1 month'' - interval ''1 day'';

        -- Get issued invoices stats (excluding drafts and voided)
        SELECT 
          COUNT(*),
          COALESCE(SUM(total_amount), 0)
        INTO v_issued_count, v_issued_total
        FROM %I.invoices
        WHERE status = ''issued''
          AND issue_date BETWEEN v_start_date AND v_end_date;

        -- Get paid invoices stats
        SELECT 
          COUNT(*),
          COALESCE(SUM(total_amount), 0)
        INTO v_paid_count, v_paid_total
        FROM %I.invoices
        WHERE status = ''issued''
          AND payment_status = ''paid''
          AND issue_date BETWEEN v_start_date AND v_end_date;

        -- Get pending invoices stats
        SELECT 
          COUNT(*),
          COALESCE(SUM(total_amount), 0)
        INTO v_pending_count, v_pending_total
        FROM %I.invoices
        WHERE status = ''issued''
          AND payment_status IN (''pending'', ''partial'')
          AND issue_date BETWEEN v_start_date AND v_end_date;

        RETURN json_build_object(
          ''issued'', json_build_object(
            ''count'', v_issued_count,
            ''total'', v_issued_total
          ),
          ''paid'', json_build_object(
            ''count'', v_paid_count,
            ''total'', v_paid_total
          ),
          ''pending'', json_build_object(
            ''count'', v_pending_count,
            ''total'', v_pending_total
          )
        );
      END;
      $func$;
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
  END LOOP;
END $$;