-- Create function to issue invoice
CREATE OR REPLACE FUNCTION issue_invoice(p_invoice_id uuid)
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

  -- Check if invoice can be issued
  IF v_invoice.status != 'draft' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invoice must be in draft status to be issued'
    );
  END IF;

  -- Update invoice status
  UPDATE invoices
  SET 
    status = 'issued',
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Invoice issued successfully'
  );
END;
$$;