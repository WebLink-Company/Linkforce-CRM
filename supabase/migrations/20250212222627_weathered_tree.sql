-- Create function to issue purchase order
CREATE OR REPLACE FUNCTION issue_purchase_order(
  p_order_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order purchase_orders%ROWTYPE;
BEGIN
  -- Get order
  SELECT * INTO v_order
  FROM purchase_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  -- Check if order can be issued
  IF v_order.status != 'draft' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order must be in draft status to be issued'
    );
  END IF;

  -- Update order status
  UPDATE purchase_orders SET
    status = 'sent',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Purchase order issued successfully'
  );
END;
$$;

-- Create function to delete purchase order
CREATE OR REPLACE FUNCTION delete_purchase_order(
  p_order_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order purchase_orders%ROWTYPE;
BEGIN
  -- Get order
  SELECT * INTO v_order
  FROM purchase_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  -- Check if order can be deleted
  IF v_order.status != 'draft' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only draft orders can be deleted'
    );
  END IF;

  -- Delete order items first
  DELETE FROM purchase_order_items
  WHERE purchase_order_id = p_order_id;

  -- Delete order
  DELETE FROM purchase_orders
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Purchase order deleted successfully'
  );
END;
$$;