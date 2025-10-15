-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Mikaza Sukaza Property Management System
-- ============================================
-- This migration implements RLS policies that match the RBAC permission system
-- Ensures database-level security even if client-side checks are bypassed

-- ============================================
-- DROP EXISTING POLICIES (if re-running migration)
-- ============================================

-- Drop all existing policies to allow clean re-creation
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Drop existing helper functions
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_ops();
DROP FUNCTION IF EXISTS public.is_admin_or_ops();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's role from JWT
-- NOTE: This function is marked IMMUTABLE to work with RLS and indexes
-- It only reads from JWT claims, not from the database
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'user_type',
    ''
  );
$$ LANGUAGE SQL IMMUTABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'admin';
$$ LANGUAGE SQL IMMUTABLE;

-- Check if current user is ops
CREATE OR REPLACE FUNCTION public.is_ops()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'ops';
$$ LANGUAGE SQL IMMUTABLE;

-- Check if current user is admin or ops
CREATE OR REPLACE FUNCTION public.is_admin_or_ops()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'ops');
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================
-- PROPERTIES TABLE
-- ============================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Admin: Full access to all properties
CREATE POLICY "Admins have full access to properties"
ON properties FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ops: Can view and edit all properties, cannot delete
CREATE POLICY "Ops can view all properties"
ON properties FOR SELECT
TO authenticated
USING (public.is_admin_or_ops());

CREATE POLICY "Ops can create properties"
ON properties FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_ops());

CREATE POLICY "Ops can update properties"
ON properties FOR UPDATE
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- ============================================
-- PROPERTY RELATED TABLES (1:1 relationships)
-- ============================================

-- Property Location
ALTER TABLE property_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property locations based on property access"
ON property_location FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = property_location.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage property locations"
ON property_location FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Property Communication
ALTER TABLE property_communication ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property communication based on property access"
ON property_communication FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = property_communication.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage property communication"
ON property_communication FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Property Access
ALTER TABLE property_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property access based on property access"
ON property_access FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = property_access.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage property access"
ON property_access FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Property Extras
ALTER TABLE property_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property extras based on property access"
ON property_extras FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = property_extras.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage property extras"
ON property_extras FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- ============================================
-- PROPERTY IMAGES
-- ============================================

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property images based on property access"
ON property_images FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = property_images.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage property images"
ON property_images FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- ============================================
-- BOOKINGS
-- ============================================

ALTER TABLE property_bookings ENABLE ROW LEVEL SECURITY;

-- Admin and Ops: Full access to all bookings
CREATE POLICY "Admin and Ops can view all bookings"
ON property_bookings FOR SELECT
TO authenticated
USING (public.is_admin_or_ops());

CREATE POLICY "Admin and Ops can create bookings"
ON property_bookings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_ops());

CREATE POLICY "Admin and Ops can update bookings"
ON property_bookings FOR UPDATE
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Only Admin can hard delete bookings (Ops uses soft delete via status update)
CREATE POLICY "Only admins can delete bookings"
ON property_bookings FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- JOBS
-- ============================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Admin: Full access to all jobs
CREATE POLICY "Admins have full access to jobs"
ON jobs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ops: Full access to jobs
CREATE POLICY "Ops can view all jobs"
ON jobs FOR SELECT
TO authenticated
USING (public.is_ops());

CREATE POLICY "Ops can create jobs"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (public.is_ops());

CREATE POLICY "Ops can update jobs"
ON jobs FOR UPDATE
TO authenticated
USING (public.is_ops())
WITH CHECK (public.is_ops());

CREATE POLICY "Ops can delete their own jobs"
ON jobs FOR DELETE
TO authenticated
USING (public.is_ops() AND created_by = auth.uid());

-- Job Tasks
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job tasks if they can view the job"
ON job_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.job_id = job_tasks.job_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage job tasks"
ON job_tasks FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Job Comments
ALTER TABLE job_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job comments if they can view the job"
ON job_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.job_id = job_comments.job_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can create job comments"
ON job_comments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_ops());

-- Job Attachments
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job attachments if they can view the job"
ON job_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.job_id = job_attachments.job_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage job attachments"
ON job_attachments FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- ============================================
-- TASKS (TODOS) - OPS ONLY
-- ============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Ops: Full access to all tasks (Admin does NOT have access per RBAC)
CREATE POLICY "Ops have full access to tasks"
ON tasks FOR ALL
TO authenticated
USING (public.is_ops())
WITH CHECK (public.is_ops());

-- Task Checklists
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops can view task checklists"
ON task_checklists FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.task_id = task_checklists.task_id
    AND public.is_ops()
  )
);

CREATE POLICY "Ops can manage task checklists"
ON task_checklists FOR ALL
TO authenticated
USING (public.is_ops())
WITH CHECK (public.is_ops());

-- ============================================
-- ISSUES
-- ============================================

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Admin and Ops: Full access to issues
CREATE POLICY "Admin and Ops can view all issues"
ON issues FOR SELECT
TO authenticated
USING (public.is_admin_or_ops());

CREATE POLICY "Admin and Ops can create issues"
ON issues FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_ops());

CREATE POLICY "Admin and Ops can update issues"
ON issues FOR UPDATE
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Only Admin can delete issues (preserve audit trail)
CREATE POLICY "Only admins can delete issues"
ON issues FOR DELETE
TO authenticated
USING (public.is_admin());

-- Issue Photos
ALTER TABLE issue_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view issue photos if they can view the issue"
ON issue_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM issues i
    WHERE i.issue_id = issue_photos.issue_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can upload issue photos"
ON issue_photos FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_ops());

CREATE POLICY "Users can delete their own issue photos"
ON issue_photos FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() AND public.is_admin_or_ops());

-- ============================================
-- USERS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin: Full access to all users
CREATE POLICY "Admins have full access to users"
ON users FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ops: Can view all users (for assignments), cannot modify
CREATE POLICY "Ops can view all users"
ON users FOR SELECT
TO authenticated
USING (public.is_admin_or_ops());

-- All users can view their own profile
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- All users can update their own profile (limited fields)
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can create notifications for any user
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true); -- Any authenticated user can create notifications

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- STATIC REFERENCE DATA
-- ============================================

-- Amenities - Read-only for all, Admin can manage
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view amenities"
ON amenities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage amenities"
ON amenities FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Rules - Read-only for all, Admin can manage
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view rules"
ON rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage rules"
ON rules FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================
-- JUNCTION TABLES
-- ============================================

-- Property Amenities
ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property amenities based on property access"
ON property_amenities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = property_amenities.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage property amenities"
ON property_amenities FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Property Rules
ALTER TABLE property_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property rules based on property access"
ON property_rules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = property_rules.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage property rules"
ON property_rules FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- ============================================
-- UNITS
-- ============================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view units based on property access"
ON units FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.property_id = units.property_id
    AND (public.is_admin_or_ops())
  )
);

CREATE POLICY "Admin and Ops can manage units"
ON units FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- ============================================
-- FINANCIAL TABLES (if they exist)
-- ============================================

-- Note: Add RLS for bank_accounts, credit_cards, financial tables as needed
-- These should have strict access controls based on your business requirements

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ops() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_ops() TO authenticated;

-- ============================================
-- NOTES
-- ============================================
-- 1. These policies assume auth.uid() returns the current user's ID
-- 2. User roles are stored in the users table (user_type column)
-- 3. Policies match RBAC permissions defined in src/lib/rbac/permissions.ts
-- 4. Admin has full access except to todos (by design)
-- 5. Ops has access to todos but not to delete properties/issues
-- 6. All policies use authenticated role (requires login)
-- 7. For public access (guest bookings), add separate policies with TO anon
