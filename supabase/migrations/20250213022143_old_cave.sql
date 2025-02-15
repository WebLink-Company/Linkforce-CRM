-- Drop existing function
DROP FUNCTION IF EXISTS get_pending_payables();

-- Create function to get pending payables with unique IDs
CREATE OR REPLACE FUNCTION get_pending_payables()
RETURNS TABLE (
  order_id uuid,
  supplier_id uuid,
  supplier_name text,
  order_number text,
  issue_date date,
  expected_date date,
  total_amount numeric,
  paid_amount numeric,
  pending_amount numeric,
  days_overdue integer,
  supplier jsonb,
  items jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH payment_totals AS (
    SELECT 
      si.purchase_order_id,
      COALESCE(SUM(sp.amount), 0) as total_paid
    FROM supplier_invoices si
    LEFT JOIN supplier_payments sp ON sp.invoice_id = si.id
    WHERE si.status = 'approved'
    GROUP BY si.purchase_order_id
  )
  SELECT DISTINCT ON (po.id)
    po.id as order_id,
    po.supplier_id,
    s.business_name as supplier_name,
    po.number as order_number,
    po.issue_date,
    po.expected_date,
    po.total_amount,
    COALESCE(pt.total_paid, 0) as paid_amount,
    po.total_amount - COALESCE(pt.total_paid, 0) as pending_amount,
    CASE 
      WHEN po.expected_date < CURRENT_DATE 
      THEN (CURRENT_DATE - po.expected_date)::integer
      ELSE 0
    END as days_overdue,
    jsonb_build_object(
      'id', s.id,
      'business_name', s.business_name,
      'commercial_name', s.commercial_name,
      'tax_id', s.tax_id,
      'email', s.email,
      'phone', s.phone,
      'address', s.address
    ) as supplier,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', poi.id,
            'product_id', poi.product_id,
            'quantity', poi.quantity,
            'unit_price', poi.unit_price,
            'tax_rate', poi.tax_rate,
            'tax_amount', poi.tax_amount,
            'discount_rate', poi.discount_rate,
            'discount_amount', poi.discount_amount,
            'total_amount', poi.total_amount,
            'product', jsonb_build_object(
              'id', pp.id,
              'name', pp.name,
              'code', pp.code,
              'unit_measure', pp.unit_measure
            )
          )
        )
        FROM purchase_order_items poi
        LEFT JOIN purchase_products pp ON pp.id = poi.product_id
        WHERE poi.purchase_order_id = po.id
      ),
      '[]'::jsonb
    ) as items
  FROM purchase_orders po
  JOIN suppliers s ON s.id = po.supplier_id
  LEFT JOIN payment_totals pt ON pt.purchase_order_id = po.id
  WHERE po.status = 'sent'
    AND (pt.total_paid IS NULL OR pt.total_paid < po.total_amount)
  ORDER BY po.id, po.expected_date ASC;
END;
$$;