-- Update Bill Templates RLS Policies for Global Templates
-- Date: 2025-10-22
-- Purpose: Allow admin/ops to create and manage global templates (property_id IS NULL)

-- =============================================
-- DROP EXISTING POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view bill templates for their properties" ON bill_templates;
DROP POLICY IF EXISTS "Users can create bill templates" ON bill_templates;
DROP POLICY IF EXISTS "Users can update their bill templates" ON bill_templates;
DROP POLICY IF EXISTS "Users can delete their bill templates" ON bill_templates;

-- =============================================
-- CREATE UPDATED POLICIES
-- =============================================

-- SELECT Policy: Users can view templates for their properties + admin/ops can view all
CREATE POLICY "Users can view bill templates"
  ON bill_templates FOR SELECT
  USING (
    -- Property-specific templates: owner can view
    (
      property_id IS NOT NULL
      AND property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
    OR
    -- Global templates: admin and ops can view all
    (
      is_global = true
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.user_id = auth.uid()
        AND users.user_type IN ('admin', 'ops')
      )
    )
    OR
    -- Templates assigned to user's properties via assignments table
    (
      is_global = true
      AND EXISTS (
        SELECT 1 FROM bill_template_property_assignments btpa
        JOIN properties p ON btpa.property_id = p.property_id
        WHERE btpa.template_id = bill_templates.template_id
        AND p.owner_id = auth.uid()
      )
    )
  );

-- INSERT Policy: Users can create templates for their properties + admin/ops can create global
CREATE POLICY "Users can create bill templates"
  ON bill_templates FOR INSERT
  WITH CHECK (
    -- Property-specific templates: owner can create
    (
      property_id IS NOT NULL
      AND property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
    OR
    -- Global templates: only admin and ops can create
    (
      (property_id IS NULL OR is_global = true)
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.user_id = auth.uid()
        AND users.user_type IN ('admin', 'ops')
      )
    )
  );

-- UPDATE Policy: Users can update their templates + admin/ops can update global
CREATE POLICY "Users can update bill templates"
  ON bill_templates FOR UPDATE
  USING (
    -- Property-specific templates: owner can update
    (
      property_id IS NOT NULL
      AND property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
    OR
    -- Global templates: admin and ops can update
    (
      (property_id IS NULL OR is_global = true)
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.user_id = auth.uid()
        AND users.user_type IN ('admin', 'ops')
      )
    )
  );

-- DELETE Policy: Users can delete their templates + admin/ops can delete global
CREATE POLICY "Users can delete bill templates"
  ON bill_templates FOR DELETE
  USING (
    -- Property-specific templates: owner can delete
    (
      property_id IS NOT NULL
      AND property_id IN (
        SELECT property_id FROM properties
        WHERE owner_id = auth.uid()
      )
    )
    OR
    -- Global templates: admin and ops can delete
    (
      (property_id IS NULL OR is_global = true)
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.user_id = auth.uid()
        AND users.user_type IN ('admin', 'ops')
      )
    )
  );

-- =============================================
-- UPDATE BILL TEMPLATE ITEMS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view bill template items" ON bill_template_items;
DROP POLICY IF EXISTS "Users can create bill template items" ON bill_template_items;
DROP POLICY IF EXISTS "Users can update bill template items" ON bill_template_items;
DROP POLICY IF EXISTS "Users can delete bill template items" ON bill_template_items;

-- SELECT Policy for items
CREATE POLICY "Users can view bill template items"
  ON bill_template_items FOR SELECT
  USING (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE
        -- Property-specific templates
        (
          property_id IS NOT NULL
          AND property_id IN (
            SELECT property_id FROM properties
            WHERE owner_id = auth.uid()
          )
        )
        OR
        -- Global templates: admin/ops can view
        (
          is_global = true
          AND EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
          )
        )
        OR
        -- Templates assigned to user's properties
        (
          is_global = true
          AND EXISTS (
            SELECT 1 FROM bill_template_property_assignments btpa
            JOIN properties p ON btpa.property_id = p.property_id
            WHERE btpa.template_id = bill_templates.template_id
            AND p.owner_id = auth.uid()
          )
        )
    )
  );

-- INSERT Policy for items
CREATE POLICY "Users can create bill template items"
  ON bill_template_items FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE
        (
          property_id IS NOT NULL
          AND property_id IN (
            SELECT property_id FROM properties
            WHERE owner_id = auth.uid()
          )
        )
        OR
        (
          (property_id IS NULL OR is_global = true)
          AND EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
          )
        )
    )
  );

-- UPDATE Policy for items
CREATE POLICY "Users can update bill template items"
  ON bill_template_items FOR UPDATE
  USING (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE
        (
          property_id IS NOT NULL
          AND property_id IN (
            SELECT property_id FROM properties
            WHERE owner_id = auth.uid()
          )
        )
        OR
        (
          (property_id IS NULL OR is_global = true)
          AND EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
          )
        )
    )
  );

-- DELETE Policy for items
CREATE POLICY "Users can delete bill template items"
  ON bill_template_items FOR DELETE
  USING (
    template_id IN (
      SELECT template_id FROM bill_templates
      WHERE
        (
          property_id IS NOT NULL
          AND property_id IN (
            SELECT property_id FROM properties
            WHERE owner_id = auth.uid()
          )
        )
        OR
        (
          (property_id IS NULL OR is_global = true)
          AND EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
          )
        )
    )
  );
