-- Add relationship between purchase products and raw materials
ALTER TABLE raw_materials
ADD COLUMN purchase_product_id uuid REFERENCES purchase_products(id);

-- Create function to sync raw material stock with purchase product
CREATE OR REPLACE FUNCTION sync_raw_material_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- If this raw material is linked to a purchase product, sync the stock
  IF NEW.purchase_product_id IS NOT NULL THEN
    UPDATE purchase_products
    SET current_stock = NEW.current_stock
    WHERE id = NEW.purchase_product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock sync
CREATE TRIGGER sync_material_stock
  AFTER UPDATE OF current_stock ON raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION sync_raw_material_stock();

-- Create function to create raw material from purchase product
CREATE OR REPLACE FUNCTION create_raw_material_from_purchase(
  p_product_id uuid,
  p_lot_number text,
  p_expiration_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product purchase_products%ROWTYPE;
  v_material_id uuid;
BEGIN
  -- Get purchase product
  SELECT * INTO v_product
  FROM purchase_products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Purchase product not found'
    );
  END IF;

  -- Create raw material
  INSERT INTO raw_materials (
    name,
    description,
    supplier_id,
    unit_measure,
    min_stock,
    current_stock,
    reorder_point,
    lot_number,
    expiration_date,
    purchase_product_id,
    created_by
  ) VALUES (
    v_product.name,
    v_product.description,
    v_product.default_supplier_id,
    v_product.unit_measure,
    v_product.min_order_quantity,
    v_product.current_stock,
    v_product.min_order_quantity * 2,
    p_lot_number,
    p_expiration_date,
    v_product.id,
    auth.uid()
  )
  RETURNING id INTO v_material_id;

  RETURN json_build_object(
    'success', true,
    'material_id', v_material_id
  );
END;
$$;