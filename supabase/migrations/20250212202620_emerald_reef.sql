-- Create function to get pending payables
CREATE OR REPLACE FUNCTION get_pending_payables()
RETURNS TABLE (
  invoice_id uuid,
  supplier_id uuid,
  supplier_name text,
  invoice_number text,
  issue_date date,
  due_date date,
  total_amount numeric,
  paid_amount numeric,
  pending_amount numeric,
  days_overdue integer,
  supplier jsonb,
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
    FROM supplier_payments p
    LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
    GROUP BY p.invoice_id
  )
  SELECT 
    i.id as invoice_id,
    i.supplier_id,
    s.business_name as supplier_name,
    i.number as invoice_number,
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
        FROM supplier_invoice_items ii
        LEFT JOIN inventory_items p ON p.id = ii.product_id
        WHERE ii.invoice_id = i.id
      ),
      '[]'::jsonb
    ) as items,
    COALESCE(pt.payments_json, '[]'::jsonb) as payments
  FROM supplier_invoices i
  JOIN suppliers s ON s.id = i.supplier_id
  LEFT JOIN payment_totals pt ON pt.invoice_id = i.id
  WHERE i.status = 'approved'
    AND i.payment_status IN ('pending', 'partial')
  ORDER BY i.due_date ASC;
END;
$$;

-- Create function to get monthly expenses by category
CREATE OR REPLACE FUNCTION get_monthly_expenses_by_category(
  p_year integer,
  p_month integer
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  total_amount numeric,
  expense_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.id as category_id,
    ec.name as category_name,
    COALESCE(SUM(e.total_amount), 0) as total_amount,
    COUNT(e.id)::integer as expense_count
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND EXTRACT(YEAR FROM e.date) = p_year
    AND EXTRACT(MONTH FROM e.date) = p_month
    AND e.status = 'approved'
  GROUP BY ec.id, ec.name
  ORDER BY total_amount DESC;
END;
$$;

-- Create function to get expense summary
CREATE OR REPLACE FUNCTION get_expense_summary(
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
  v_pending numeric;
  v_approved numeric;
  v_rejected numeric;
BEGIN
  -- Get totals by status
  SELECT
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'rejected' THEN total_amount ELSE 0 END), 0)
  INTO v_total, v_pending, v_approved, v_rejected
  FROM expenses
  WHERE date BETWEEN p_start_date AND p_end_date;

  RETURN json_build_object(
    'total', v_total,
    'pending', v_pending,
    'approved', v_approved,
    'rejected', v_rejected,
    'start_date', p_start_date,
    'end_date', p_end_date
  );
END;
$$;

-- Create function to approve expense
CREATE OR REPLACE FUNCTION approve_expense(
  p_expense_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense expenses%ROWTYPE;
  v_category expense_categories%ROWTYPE;
BEGIN
  -- Get expense
  SELECT * INTO v_expense
  FROM expenses
  WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Expense not found'
    );
  END IF;

  -- Check if expense can be approved
  IF v_expense.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only pending expenses can be approved'
    );
  END IF;

  -- Get category to get account
  SELECT * INTO v_category
  FROM expense_categories
  WHERE id = v_expense.category_id;

  -- Update expense
  UPDATE expenses SET
    status = 'approved',
    approved_by = p_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_expense_id;

  -- Create account movement if category has account
  IF v_category.account_id IS NOT NULL THEN
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
      v_category.account_id,
      v_expense.date,
      'debit',
      v_expense.total_amount,
      'expense',
      v_expense.id,
      'Gasto: ' || v_expense.description,
      p_user_id
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Expense approved successfully'
  );
END;
$$;

-- Create function to reject expense
CREATE OR REPLACE FUNCTION reject_expense(
  p_expense_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense expenses%ROWTYPE;
BEGIN
  -- Get expense
  SELECT * INTO v_expense
  FROM expenses
  WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Expense not found'
    );
  END IF;

  -- Check if expense can be rejected
  IF v_expense.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only pending expenses can be rejected'
    );
  END IF;

  -- Update expense
  UPDATE expenses SET
    status = 'rejected',
    notes = COALESCE(notes, '') || E'\nRejected: ' || p_reason,
    updated_at = now()
  WHERE id = p_expense_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Expense rejected successfully'
  );
END;
$$;