-- Create function to handle invoice updates
CREATE OR REPLACE FUNCTION update_invoice(
  p_invoice_id uuid,
  p_notes text,
  p_due_date date,
  p_items jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_subtotal numeric := 0;
  v_tax_amount numeric := 0;
  v_discount_amount numeric := 0;
  v_total_amount numeric := 0;
  v_item jsonb;
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

  -- Check if invoice can be updated
  IF v_invoice.status != 'draft' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only draft invoices can be updated'
    );
  END IF;

  -- Start transaction
  BEGIN
    -- Delete existing items
    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;

    -- Insert new items and calculate totals
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      -- Insert new item
      INSERT INTO invoice_items (
        invoice_id,
        product_id,
        quantity,
        unit_price,
        tax_rate,
        tax_amount,
        discount_rate,
        discount_amount,
        total_amount
      ) VALUES (
        p_invoice_id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::numeric,
        (v_item->>'unit_price')::numeric,
        (v_item->>'tax_rate')::numeric,
        (v_item->>'tax_amount')::numeric,
        (v_item->>'discount_rate')::numeric,
        (v_item->>'discount_amount')::numeric,
        (v_item->>'total_amount')::numeric
      );

      -- Accumulate totals
      v_subtotal := v_subtotal + ((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric);
      v_tax_amount := v_tax_amount + (v_item->>'tax_amount')::numeric;
      v_discount_amount := v_discount_amount + (v_item->>'discount_amount')::numeric;
      v_total_amount := v_total_amount + (v_item->>'total_amount')::numeric;
    END LOOP;

    -- Update invoice
    UPDATE invoices SET
      notes = p_notes,
      due_date = p_due_date,
      subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      discount_amount = v_discount_amount,
      total_amount = v_total_amount,
      updated_at = now()
    WHERE id = p_invoice_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Invoice updated successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;