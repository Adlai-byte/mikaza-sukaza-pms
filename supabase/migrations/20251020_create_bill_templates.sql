-- Bill Templates Migration
-- Create tables for preset bill templates with line items
-- Date: 2025-10-20

-- =============================================
-- 1. CREATE bill_templates TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bill_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_bill_templates_property_id ON bill_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_bill_templates_active ON bill_templates(is_active);

-- Add comments
COMMENT ON TABLE bill_templates IS 'Preset bill templates for quick invoice creation';
COMMENT ON COLUMN bill_templates.template_name IS 'Template name (e.g., "Standard 5-Night Package")';
COMMENT ON COLUMN bill_templates.property_id IS 'Property this template belongs to';
COMMENT ON COLUMN bill_templates.display_order IS 'Order for displaying templates';

-- =============================================
-- 2. CREATE bill_template_items TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bill_template_items (
  template_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES bill_templates(template_id) ON DELETE CASCADE NOT NULL,
  line_number INTEGER NOT NULL,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1 NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  item_type VARCHAR(50) DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_quantity_positive CHECK (quantity > 0),
  CONSTRAINT check_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT check_tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_bill_template_items_template_id ON bill_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_bill_template_items_line_number ON bill_template_items(template_id, line_number);

-- Add comments
COMMENT ON TABLE bill_template_items IS 'Line items within bill templates';
COMMENT ON COLUMN bill_template_items.line_number IS 'Order of line item within template';
COMMENT ON COLUMN bill_template_items.item_type IS 'Type: accommodation, cleaning, extras, tax, commission, other';

-- =============================================
-- 3. CREATE TRIGGER for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_bill_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bill_template_updated_at ON bill_templates;
CREATE TRIGGER trigger_update_bill_template_updated_at
  BEFORE UPDATE ON bill_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_template_updated_at();

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE bill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_template_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view bill templates for their properties" ON bill_templates;
DROP POLICY IF EXISTS "Users can create bill templates" ON bill_templates;
DROP POLICY IF EXISTS "Users can update their bill templates" ON bill_templates;
DROP POLICY IF EXISTS "Users can delete their bill templates" ON bill_templates;

DROP POLICY IF EXISTS "Users can view bill template items" ON bill_template_items;
DROP POLICY IF EXISTS "Users can create bill template items" ON bill_template_items;
DROP POLICY IF EXISTS "Users can update bill template items" ON bill_template_items;
DROP POLICY IF EXISTS "Users can delete bill template items" ON bill_template_items;

-- Bill Templates Policies
CREATE POLICY "Users can view bill templates for their properties"
  ON bill_templates FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM properties
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bill templates"
  ON bill_templates FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM properties
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their bill templates"
  ON bill_templates FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM properties
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their bill templates"
  ON bill_templates FOR DELETE
  USING (
    property_id IN (
      SELECT property_id FROM properties
      WHERE owner_id = auth.uid()
    )
  );

-- Bill Template Items Policies
CREATE POLICY "Users can view bill template items"
  ON bill_template_items FOR SELECT
  USING (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create bill template items"
  ON bill_template_items FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update bill template items"
  ON bill_template_items FOR UPDATE
  USING (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete bill template items"
  ON bill_template_items FOR DELETE
  USING (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
  );

-- =============================================
-- 5. SAMPLE DATA (Optional - for testing)
-- =============================================

-- Uncomment below to insert sample templates for testing
/*
-- Insert sample template (replace property_id with actual UUID)
INSERT INTO bill_templates (property_id, template_name, description, display_order, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual property_id
  'Standard 5-Night Package',
  'Standard accommodation package for 5 nights including cleaning and taxes',
  1,
  auth.uid()
);

-- Insert sample line items (replace template_id with actual UUID)
INSERT INTO bill_template_items (template_id, line_number, description, quantity, unit_price, tax_rate, item_type)
VALUES
  ('00000000-0000-0000-0000-000000000000', 1, 'Accommodation (5 nights)', 5, 100.00, 0, 'accommodation'),
  ('00000000-0000-0000-0000-000000000000', 2, 'Cleaning Fee', 1, 75.00, 0, 'cleaning'),
  ('00000000-0000-0000-0000-000000000000', 3, 'Taxes', 1, 0, 10, 'tax');
*/

-- =============================================
-- Migration Complete
-- =============================================
