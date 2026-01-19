-- =====================================================
-- Allow customers to manage scheduled services for their properties
-- =====================================================

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Customers can create services for their properties" ON scheduled_services;
DROP POLICY IF EXISTS "Customers can update their own services" ON scheduled_services;
DROP POLICY IF EXISTS "Customers can delete their own services" ON scheduled_services;

-- Allow customers to INSERT services for properties they own
CREATE POLICY "Customers can create services for their properties" ON scheduled_services
  FOR INSERT
  WITH CHECK (
    get_user_role() = 'customer'
    AND EXISTS (
      SELECT 1 FROM properties p
      WHERE p.property_id = scheduled_services.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Allow customers to UPDATE services they created or for properties they own
CREATE POLICY "Customers can update their own services" ON scheduled_services
  FOR UPDATE
  USING (
    get_user_role() = 'customer'
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM properties p
        WHERE p.property_id = scheduled_services.property_id
        AND p.owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    get_user_role() = 'customer'
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM properties p
        WHERE p.property_id = scheduled_services.property_id
        AND p.owner_id = auth.uid()
      )
    )
  );

-- Allow customers to DELETE services they created or for properties they own
CREATE POLICY "Customers can delete their own services" ON scheduled_services
  FOR DELETE
  USING (
    get_user_role() = 'customer'
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM properties p
        WHERE p.property_id = scheduled_services.property_id
        AND p.owner_id = auth.uid()
      )
    )
  );

-- Also add policy for providers to view services assigned to them
DROP POLICY IF EXISTS "Providers can view assigned services" ON scheduled_services;
CREATE POLICY "Providers can view assigned services" ON scheduled_services
  FOR SELECT
  USING (
    get_user_role() = 'provider'
    AND vendor_id IN (
      SELECT provider_id FROM providers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Add comments
COMMENT ON POLICY "Customers can create services for their properties" ON scheduled_services
  IS 'Allows property owners to schedule services for their own properties';
COMMENT ON POLICY "Customers can update their own services" ON scheduled_services
  IS 'Allows property owners to update services they created or for properties they own';
COMMENT ON POLICY "Customers can delete their own services" ON scheduled_services
  IS 'Allows property owners to delete services they created or for properties they own';
