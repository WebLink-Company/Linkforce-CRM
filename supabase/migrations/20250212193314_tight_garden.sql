-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_pending_receivables();

-- Create function to get pending receivables with fixed date calculation
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH payment_totals AS (
    SELECT 
      p.invoice_id,
      COALESCE(SUM(p.amount), 0) as total_paid
    FROM payments p
    GROUP BY p.invoice_id
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
      THEN (CURRENT_DATE - i.due_date)::integer
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