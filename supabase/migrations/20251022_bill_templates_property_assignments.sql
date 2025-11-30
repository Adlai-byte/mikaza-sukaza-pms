-- Bill Templates Property Assignments Migration
-- Enable templates to be used as profiles and assigned to multiple properties
-- Date: 2025-10-22

-- =============================================
-- 1. MODIFY bill_templates TABLE
-- =============================================

-- Remove the NOT NULL constraint from property_id to allow global templates
ALTER TABLE bill_templates
ALTER COLUMN property_id DROP NOT NULL;

-- Add is_global flag to identify templates that can be assigned to multiple properties
ALTER TABLE bill_templates
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN bill_templates.property_id IS 'Optional: Specific property (for property-specific templates). NULL for global templates.';
COMMENT ON COLUMN bill_templates.is_global IS 'If true, this template can be assigned to multiple properties';

-- =============================================
-- 2. CREATE bill_template_property_assignments TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS bill_template_property_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES bill_templates(template_id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique assignment per template-property combination
  CONSTRAINT unique_template_property UNIQUE(template_id, property_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_assignments_template ON bill_template_property_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_property ON bill_template_property_assignments(property_id);

-- Add comments
COMMENT ON TABLE bill_template_property_assignments IS 'Assignment of global bill templates to specific properties';
COMMENT ON COLUMN bill_template_property_assignments.template_id IS 'The template being assigned';
COMMENT ON COLUMN bill_template_property_assignments.property_id IS 'The property this template is assigned to';

-- =============================================
-- 3. UPDATE EXISTING TEMPLATES
-- =============================================

-- Convert existing property-specific templates to global with assignments
DO $$
DECLARE
  template_record RECORD;
BEGIN
  -- For each existing template that has a property_id
  FOR template_record IN
    SELECT template_id, property_id
    FROM bill_templates
    WHERE property_id IS NOT NULL
  LOOP
    -- Create assignment
    INSERT INTO bill_template_property_assignments (template_id, property_id)
    VALUES (template_record.template_id, template_record.property_id)
    ON CONFLICT (template_id, property_id) DO NOTHING;

    -- Mark as global and remove property_id
    UPDATE bill_templates
    SET is_global = true,
        property_id = NULL
    WHERE template_id = template_record.template_id;
  END LOOP;
END $$;

-- =============================================
-- 4. RLS POLICIES FOR ASSIGNMENTS TABLE
-- =============================================

-- Enable RLS
ALTER TABLE bill_template_property_assignments ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "bill_template_assignments_select" ON bill_template_property_assignments;
DROP POLICY IF EXISTS "bill_template_assignments_insert" ON bill_template_property_assignments;
DROP POLICY IF EXISTS "bill_template_assignments_delete" ON bill_template_property_assignments;

-- Policy: Admin and Ops can view all assignments
CREATE POLICY "bill_template_assignments_select" ON bill_template_property_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.user_type IN ('admin', 'ops')
  )
);

-- Policy: Admin and Ops can create assignments
CREATE POLICY "bill_template_assignments_insert" ON bill_template_property_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.user_type IN ('admin', 'ops')
  )
);

-- Policy: Admin and Ops can delete assignments
CREATE POLICY "bill_template_assignments_delete" ON bill_template_property_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.user_type IN ('admin', 'ops')
  )
);

-- =============================================
-- 5. CREATE HELPER VIEW
-- =============================================

-- View to easily see which templates are assigned to which properties
CREATE OR REPLACE VIEW bill_templates_with_properties AS
SELECT
  bt.template_id,
  bt.template_name,
  bt.description,
  bt.is_active,
  bt.is_global,
  bt.display_order,
  bt.created_at,
  bt.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'property_id', p.property_id,
        'property_name', p.property_name
      ) ORDER BY p.property_name
    ) FILTER (WHERE p.property_id IS NOT NULL),
    '[]'::json
  ) as assigned_properties
FROM bill_templates bt
LEFT JOIN bill_template_property_assignments btpa ON bt.template_id = btpa.template_id
LEFT JOIN properties p ON btpa.property_id = p.property_id
GROUP BY bt.template_id, bt.template_name, bt.description, bt.is_active, bt.is_global,
         bt.display_order, bt.created_at, bt.updated_at;

COMMENT ON VIEW bill_templates_with_properties IS 'Bill templates with their property assignments';
