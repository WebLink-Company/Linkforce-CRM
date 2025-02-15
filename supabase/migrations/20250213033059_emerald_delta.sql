-- Create raw materials table
CREATE TABLE IF NOT EXISTS raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  supplier_id uuid REFERENCES suppliers(id),
  unit_measure text NOT NULL,
  min_stock numeric(15,2) NOT NULL DEFAULT 0,
  current_stock numeric(15,2) NOT NULL DEFAULT 0,
  reorder_point numeric(15,2) NOT NULL DEFAULT 0,
  lot_number text,
  expiration_date date,
  msds_url text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create raw material lots table
CREATE TABLE IF NOT EXISTS raw_material_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES raw_materials(id) NOT NULL,
  lot_number text NOT NULL,
  quantity numeric(15,2) NOT NULL,
  production_date date NOT NULL,
  expiration_date date NOT NULL,
  supplier_lot_number text,
  certificate_number text,
  status text DEFAULT 'active',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(material_id, lot_number)
);

-- Create raw material movements table
CREATE TABLE IF NOT EXISTS raw_material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES raw_materials(id) NOT NULL,
  lot_id uuid REFERENCES raw_material_lots(id),
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity numeric(15,2) NOT NULL,
  previous_stock numeric(15,2) NOT NULL,
  new_stock numeric(15,2) NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create raw material quality controls table
CREATE TABLE IF NOT EXISTS raw_material_quality_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid REFERENCES raw_material_lots(id) NOT NULL,
  parameter text NOT NULL,
  expected_value text NOT NULL,
  actual_value text NOT NULL,
  result text NOT NULL CHECK (result IN ('approved', 'rejected')),
  notes text,
  tested_by uuid REFERENCES auth.users(id),
  tested_at timestamptz DEFAULT now()
);

-- Create raw material documents table
CREATE TABLE IF NOT EXISTS raw_material_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES raw_materials(id) NOT NULL,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_quality_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Raw materials are viewable by authenticated users"
  ON raw_materials FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Raw materials can be created by authenticated users"
  ON raw_materials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Raw materials can be updated by authenticated users"
  ON raw_materials FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  ));

-- Create indexes
CREATE INDEX idx_raw_materials_code ON raw_materials(code);
CREATE INDEX idx_raw_materials_supplier ON raw_materials(supplier_id);
CREATE INDEX idx_raw_material_lots_material ON raw_material_lots(material_id);
CREATE INDEX idx_raw_material_lots_lot_number ON raw_material_lots(lot_number);
CREATE INDEX idx_raw_material_movements_material ON raw_material_movements(material_id);
CREATE INDEX idx_raw_material_movements_lot ON raw_material_movements(lot_id);
CREATE INDEX idx_raw_material_quality_controls_lot ON raw_material_quality_controls(lot_id);

-- Create function to update stock
CREATE OR REPLACE FUNCTION update_raw_material_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE raw_materials
  SET 
    current_stock = NEW.new_stock,
    updated_at = now()
  WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
CREATE TRIGGER update_material_stock
  AFTER INSERT ON raw_material_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_raw_material_stock();

-- Create function to check stock levels
CREATE OR REPLACE FUNCTION check_raw_material_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock is below minimum
  IF NEW.current_stock <= NEW.min_stock THEN
    -- Insert notification or alert
    -- This is a placeholder for the actual notification system
    RAISE NOTICE 'Stock crítico para materia prima %', NEW.code;
  -- Check if stock is below reorder point
  ELSIF NEW.current_stock <= NEW.reorder_point THEN
    -- Insert notification or alert
    RAISE NOTICE 'Stock bajo para materia prima %', NEW.code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock level checks
CREATE TRIGGER check_material_stock
  AFTER UPDATE OF current_stock ON raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION check_raw_material_stock();