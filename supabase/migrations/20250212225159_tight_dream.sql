-- Drop existing functions first
DROP FUNCTION IF EXISTS get_accounts_payable();
DROP FUNCTION IF EXISTS get_pending_payables();

-- Create function to get accounts payable
CREATE OR REPLACE FUNCTION get_accounts_payable()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
  v_count integer;
BEGIN
  SELECT 
    COALESCE(SUM(po.total_amount), 0),
    COUNT(DISTINCT po.id)
  INTO v_total, v_count
  FROM purchase_orders po
  WHERE po.status = 'sent'
    AND NOT EXISTS (
      SELECT 1 FROM supplier_invoices si
      WHERE si.purchase_order_id = po.id
    );

  RETURN json_build_object(
    'total', v_total,
    'count', v_count
  );
END;
$$;

-- Create function to get pending payables
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
  SELECT 
    po.id as order_id,
    po.supplier_id,
    s.business_name as supplier_name,
    po.number as order_number,
    po.issue_date,
    po.expected_date,
    po.total_amount,
    COALESCE(
      (SELECT SUM(amount) FROM supplier_payments sp
       WHERE sp.purchase_order_id = po.id),
      0
    ) as paid_amount,
    po.total_amount - COALESCE(
      (SELECT SUM(amount) FROM supplier_payments sp
       WHERE sp.purchase_order_id = po.id),
      0
    ) as pending_amount,
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
              'id', p.id,
              'name', p.name,
              'code', p.code,
              'unit_measure', p.unit_measure
            )
          )
        )
        FROM purchase_order_items poi
        LEFT JOIN purchase_products p ON p.id = poi.product_id
        WHERE poi.purchase_order_id = po.id
      ),
      '[]'::jsonb
    ) as items
  FROM purchase_orders po
  JOIN suppliers s ON s.id = po.supplier_id
  WHERE po.status = 'sent'
    AND NOT EXISTS (
      SELECT 1 FROM supplier_invoices si
      WHERE si.purchase_order_id = po.id
    )
  ORDER BY po.expected_date ASC;
END;
$$;