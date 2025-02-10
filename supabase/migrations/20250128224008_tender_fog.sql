CREATE OR REPLACE FUNCTION create_inventory_movement(
  p_item_id uuid,
  p_movement_type movement_type,
  p_quantity numeric,
  p_previous_stock numeric,
  p_new_stock numeric,
  p_notes text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_movement_id uuid;
BEGIN
  -- Start transaction
  BEGIN
    -- Create movement record
    INSERT INTO inventory_movements (
      item_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      notes,
      created_by
    ) VALUES (
      p_item_id,
      p_movement_type,
      p_quantity,
      p_previous_stock,
      p_new_stock,
      p_notes,
      auth.uid()
    ) RETURNING id INTO v_movement_id;

    -- Update item stock
    UPDATE inventory_items
    SET 
      current_stock = p_new_stock,
      updated_at = now(),
      updated_by = auth.uid()
    WHERE id = p_item_id;

    -- Return success
    RETURN json_build_object(
      'success', true,
      'movement_id', v_movement_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Return error
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;