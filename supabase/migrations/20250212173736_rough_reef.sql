-- Create function to get pending receivables
CREATE OR REPLACE FUNCTION get_pending_receivables()
RETURNS TABLE (
  invoice_id uuid,
  customer_id uuid,
  customer_name text,
  invoice_number text,
  issue_date date,
  due_date date,
  total_amount numeric,
  paid_amount numeric,
  pending_amount numeric,
  days_overdue integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH payment_totals AS (
    SELECT 
      invoice_id,
      COALESCE(SUM(amount), 0) as total_paid
    FROM payments
    GROUP BY invoice_id
  )
  SELECT 
    i.id as invoice_id,
    i.customer_id,
    c.full_name as customer_name,
    i.ncf as invoice_number,
    i.issue_date,
    i.due_date,
    i.total_amount,
    COALESCE(pt.total_paid, 0) as paid_amount,
    i.total_amount - COALESCE(pt.total_paid, 0) as pending_amount,
    CASE 
      WHEN i.due_date < CURRENT_DATE 
      THEN DATE_PART('day', CURRENT_DATE - i.due_date)::integer
      ELSE 0
    END as days_overdue
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  LEFT JOIN payment_totals pt ON pt.invoice_id = i.id
  WHERE i.status = 'issued'
    AND i.payment_status IN ('pending', 'partial')
  ORDER BY i.due_date ASC;
END;
$$;