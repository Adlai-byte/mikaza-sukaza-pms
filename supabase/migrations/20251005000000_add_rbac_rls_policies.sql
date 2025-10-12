-- Migration: Add RBAC Row Level Security Policies
-- Created: 2025-10-05
-- Purpose: Implement role-based access control at the database level
--
-- This migration creates RLS policies that enforce the following access rules:
-- - Admin users: Full access to all tables and operations
-- - Ops users: Limited access - can view/edit properties, cannot delete properties, cannot manage users
--
-- NOTE: These policies assume Supabase Auth is properly configured with user metadata
-- containing the user_type field. For session-based auth, these policies provide
-- an additional security layer when Supabase Auth is enabled.

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the current user's ID from Supabase Auth
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the current user's type (admin or ops)
-- This assumes the user_type is stored in the users table
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS TEXT AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  SELECT user_type INTO v_user_type
  FROM public.users
  WHERE user_id = auth.uid();

  RETURN v_user_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_type() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is ops
CREATE OR REPLACE FUNCTION public.is_ops()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_type() = 'ops';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_type() = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DROP EXISTING PERMISSIVE POLICIES
-- ============================================================================

-- Users table
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

-- Bank accounts and credit cards
DROP POLICY IF EXISTS "Allow all operations on bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Allow all operations on credit_cards" ON public.credit_cards;

-- Properties and related tables (drop if they exist)
DROP POLICY IF EXISTS "Allow all operations on properties" ON public.properties;
DROP POLICY IF EXISTS "Allow all operations on property_location" ON public.property_location;
DROP POLICY IF EXISTS "Allow all operations on property_communication" ON public.property_communication;
DROP POLICY IF EXISTS "Allow all operations on property_access" ON public.property_access;
DROP POLICY IF EXISTS "Allow all operations on property_extras" ON public.property_extras;
DROP POLICY IF EXISTS "Allow all operations on units" ON public.units;
DROP POLICY IF EXISTS "Allow all operations on property_images" ON public.property_images;
DROP POLICY IF EXISTS "Allow all operations on property_amenities" ON public.property_amenities;
DROP POLICY IF EXISTS "Allow all operations on property_rules" ON public.property_rules;

-- Property-related tables from other migrations
DROP POLICY IF EXISTS "Allow all operations on property_providers" ON public.property_providers;
DROP POLICY IF EXISTS "Allow all operations on property_vehicles" ON public.property_vehicles;
DROP POLICY IF EXISTS "Allow all operations on property_financial_entries" ON public.property_financial_entries;
DROP POLICY IF EXISTS "Allow all operations on property_checklists" ON public.property_checklists;
DROP POLICY IF EXISTS "Allow all operations on property_bookings" ON public.property_bookings;
DROP POLICY IF EXISTS "Allow all operations on property_booking_rates" ON public.property_booking_rates;
DROP POLICY IF EXISTS "Allow all operations on property_notes" ON public.property_notes;
DROP POLICY IF EXISTS "Allow all operations on property_qr_codes" ON public.property_qr_codes;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Admin: Full access to all users
-- Ops: Can view their own profile only, cannot create/edit/delete users

CREATE POLICY "Admin: Full access to users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Ops: View own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (is_ops() AND user_id = get_current_user_id());

-- ============================================================================
-- BANK ACCOUNTS & CREDIT CARDS POLICIES
-- ============================================================================
-- Admin: Full access
-- Ops: View own records only

CREATE POLICY "Admin: Full access to bank accounts"
  ON public.bank_accounts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Ops: View own bank accounts"
  ON public.bank_accounts
  FOR SELECT
  TO authenticated
  USING (is_ops() AND user_id = get_current_user_id());

CREATE POLICY "Admin: Full access to credit cards"
  ON public.credit_cards
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Ops: View own credit cards"
  ON public.credit_cards
  FOR SELECT
  TO authenticated
  USING (is_ops() AND user_id = get_current_user_id());

-- ============================================================================
-- PROPERTIES TABLE POLICIES
-- ============================================================================
-- Admin: Full access (view, create, edit, delete)
-- Ops: Can view, create, edit but CANNOT delete properties

CREATE POLICY "Admin: Full access to properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Ops: View properties"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (is_ops());

CREATE POLICY "Ops: Create properties"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (is_ops());

CREATE POLICY "Ops: Update properties"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (is_ops())
  WITH CHECK (is_ops());

-- Note: No DELETE policy for Ops - only Admin can delete via their "Full access" policy

-- ============================================================================
-- PROPERTY RELATED TABLES POLICIES
-- ============================================================================
-- Apply same pattern: Admin full access, Ops view/create/update (no delete)

-- Property Location
CREATE POLICY "Admin: Full access to property_location"
  ON public.property_location FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_location"
  ON public.property_location FOR SELECT TO authenticated USING (is_ops());

CREATE POLICY "Ops: Insert property_location"
  ON public.property_location FOR INSERT TO authenticated WITH CHECK (is_ops());

CREATE POLICY "Ops: Update property_location"
  ON public.property_location FOR UPDATE TO authenticated USING (is_ops()) WITH CHECK (is_ops());

-- Property Communication
CREATE POLICY "Admin: Full access to property_communication"
  ON public.property_communication FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_communication"
  ON public.property_communication FOR SELECT TO authenticated USING (is_ops());

CREATE POLICY "Ops: Insert property_communication"
  ON public.property_communication FOR INSERT TO authenticated WITH CHECK (is_ops());

CREATE POLICY "Ops: Update property_communication"
  ON public.property_communication FOR UPDATE TO authenticated USING (is_ops()) WITH CHECK (is_ops());

-- Property Access
CREATE POLICY "Admin: Full access to property_access"
  ON public.property_access FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_access"
  ON public.property_access FOR SELECT TO authenticated USING (is_ops());

CREATE POLICY "Ops: Insert property_access"
  ON public.property_access FOR INSERT TO authenticated WITH CHECK (is_ops());

CREATE POLICY "Ops: Update property_access"
  ON public.property_access FOR UPDATE TO authenticated USING (is_ops()) WITH CHECK (is_ops());

-- Property Extras
CREATE POLICY "Admin: Full access to property_extras"
  ON public.property_extras FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_extras"
  ON public.property_extras FOR SELECT TO authenticated USING (is_ops());

CREATE POLICY "Ops: Insert property_extras"
  ON public.property_extras FOR INSERT TO authenticated WITH CHECK (is_ops());

CREATE POLICY "Ops: Update property_extras"
  ON public.property_extras FOR UPDATE TO authenticated USING (is_ops()) WITH CHECK (is_ops());

-- Units
CREATE POLICY "Admin: Full access to units"
  ON public.units FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage units"
  ON public.units FOR SELECT TO authenticated USING (is_ops());

CREATE POLICY "Ops: Insert units"
  ON public.units FOR INSERT TO authenticated WITH CHECK (is_ops());

CREATE POLICY "Ops: Update units"
  ON public.units FOR UPDATE TO authenticated USING (is_ops()) WITH CHECK (is_ops());

-- Property Images
CREATE POLICY "Admin: Full access to property_images"
  ON public.property_images FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_images"
  ON public.property_images FOR SELECT TO authenticated USING (is_ops());

CREATE POLICY "Ops: Insert property_images"
  ON public.property_images FOR INSERT TO authenticated WITH CHECK (is_ops());

CREATE POLICY "Ops: Update property_images"
  ON public.property_images FOR UPDATE TO authenticated USING (is_ops()) WITH CHECK (is_ops());

-- Property Amenities (junction table)
CREATE POLICY "Admin: Full access to property_amenities"
  ON public.property_amenities FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_amenities"
  ON public.property_amenities FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- Property Rules (junction table)
CREATE POLICY "Admin: Full access to property_rules"
  ON public.property_rules FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_rules"
  ON public.property_rules FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- ============================================================================
-- PROPERTY OPERATIONAL TABLES POLICIES
-- ============================================================================
-- Both Admin and Ops can fully manage these operational tables

-- Property Providers
CREATE POLICY "Admin: Full access to property_providers"
  ON public.property_providers FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_providers"
  ON public.property_providers FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- Property Vehicles
CREATE POLICY "Admin: Full access to property_vehicles"
  ON public.property_vehicles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_vehicles"
  ON public.property_vehicles FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- Property Checklists
CREATE POLICY "Admin: Full access to property_checklists"
  ON public.property_checklists FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_checklists"
  ON public.property_checklists FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- Property Bookings
CREATE POLICY "Admin: Full access to property_bookings"
  ON public.property_bookings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_bookings"
  ON public.property_bookings FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- Property Booking Rates
CREATE POLICY "Admin: Full access to property_booking_rates"
  ON public.property_booking_rates FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_booking_rates"
  ON public.property_booking_rates FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- Property Notes
CREATE POLICY "Admin: Full access to property_notes"
  ON public.property_notes FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_notes"
  ON public.property_notes FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- Property QR Codes
CREATE POLICY "Admin: Full access to property_qr_codes"
  ON public.property_qr_codes FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: Manage property_qr_codes"
  ON public.property_qr_codes FOR ALL TO authenticated
  USING (is_ops()) WITH CHECK (is_ops());

-- ============================================================================
-- FINANCIAL TABLES POLICIES
-- ============================================================================
-- Admin: Full access
-- Ops: View only (no create/edit/delete)

CREATE POLICY "Admin: Full access to property_financial_entries"
  ON public.property_financial_entries FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: View property_financial_entries"
  ON public.property_financial_entries FOR SELECT TO authenticated
  USING (is_ops());

-- ============================================================================
-- AMENITIES & RULES (MASTER DATA)
-- ============================================================================
-- Admin: Full access
-- Ops: View only

CREATE POLICY "Admin: Full access to amenities"
  ON public.amenities FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: View amenities"
  ON public.amenities FOR SELECT TO authenticated
  USING (is_ops());

CREATE POLICY "Admin: Full access to rules"
  ON public.rules FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ops: View rules"
  ON public.rules FOR SELECT TO authenticated
  USING (is_ops());

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS ON HELPER FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ops() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_current_user_id() IS 'Returns the current authenticated user ID from Supabase Auth';
COMMENT ON FUNCTION public.get_current_user_type() IS 'Returns the current user type (admin or ops)';
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if current user is an admin';
COMMENT ON FUNCTION public.is_ops() IS 'Returns true if current user is ops';
COMMENT ON FUNCTION public.has_role(TEXT) IS 'Checks if current user has a specific role';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These policies require Supabase Auth to be properly configured
-- 2. User sessions must include the user_id in auth.uid()
-- 3. The users table must have the user_type populated correctly
-- 4. For session-based auth without Supabase Auth, consider using application-level
--    authorization checks in your API layer
-- 5. Test thoroughly with both Admin and Ops users before deploying to production
