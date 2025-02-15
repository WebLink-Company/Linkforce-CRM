-- Create function to void invoice
CREATE OR REPLACE FUNCTION void_invoice(
  p_invoice_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invoice not found'
    );
  END IF;

  -- Check if invoice can be voided
  IF v_invoice.status = 'voided' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invoice is already voided'
    );
  END IF;

  -- Check if invoice has payments
  IF EXISTS (
    SELECT 1 FROM payments WHERE invoice_id = p_invoice_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot void invoice with payments'
    );
  END IF;

  -- Update invoice status
  UPDATE invoices
  SET 
    status = 'voided',
    voided_at = now(),
    voided_reason = p_reason,
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Invoice voided successfully'
  );
END;
$$;