-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_pending_receivables();

-- Create function to get pending receivables with complete invoice information
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
  days_overdue integer,
  customer jsonb,
  items jsonb,
  payments jsonb
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
      COALESCE(SUM(p.amount), 0) as total_paid,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'amount', p.amount,
          'payment_date', p.payment_date,
          'reference_number', p.reference_number,
          'payment_method', pm.name,
          'notes', p.notes
        )
      ) as payments_json
    FROM payments p
    LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
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
    END as days_overdue,
    jsonb_build_object(
      'id', c.id,
      'full_name', c.full_name,
      'identification_number', c.identification_number,
      'email', c.email,
      'phone', c.phone,
      'address', c.address
    ) as customer,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ii.id,
            'product_id', ii.product_id,
            'quantity', ii.quantity,
            'unit_price', ii.unit_price,
            'tax_rate', ii.tax_rate,
            'tax_amount', ii.tax_amount,
            'discount_rate', ii.discount_rate,
            'discount_amount', ii.discount_amount,
            'total_amount', ii.total_amount,
            'product', jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'code', p.code,
              'unit_measure', p.unit_measure
            )
          )
        )
        FROM invoice_items ii
        LEFT JOIN inventory_items p ON p.id = ii.product_id
        WHERE ii.invoice_id = i.id
      ),
      '[]'::jsonb
    ) as items,
    COALESCE(pt.payments_json, '[]'::jsonb) as payments
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  LEFT JOIN payment_totals pt ON pt.invoice_id = i.id
  WHERE i.status = 'issued'
    AND i.payment_status IN ('pending', 'partial')
  ORDER BY i.due_date ASC;
END;
$$;