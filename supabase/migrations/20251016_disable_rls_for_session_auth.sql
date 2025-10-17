-- Migration: Disable RLS for Session-Based Authentication
-- Created: 2025-10-16
-- Purpose: Allow full access when using session-based auth (not Supabase Auth)
--
-- The RBAC RLS policies from 20251005000000 rely on auth.uid() which only works
-- with Supabase Auth. Since this app uses session-based authentication, we need
-- to disable RLS and rely on application-level authorization instead.

-- ============================================================================
-- DISABLE RLS ON ALL TABLES
-- ============================================================================

-- User-related tables
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.credit_cards DISABLE ROW LEVEL SECURITY;

-- Property core tables
ALTER TABLE IF EXISTS public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_location DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_communication DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_extras DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.units DISABLE ROW LEVEL SECURITY;

-- Property relationships
ALTER TABLE IF EXISTS public.property_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_amenities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_rules DISABLE ROW LEVEL SECURITY;

-- Property operational tables
ALTER TABLE IF EXISTS public.property_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_financial_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_booking_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_qr_codes DISABLE ROW LEVEL SECURITY;

-- Master data tables
ALTER TABLE IF EXISTS public.amenities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rules DISABLE ROW LEVEL SECURITY;

-- Bookings and Jobs
ALTER TABLE IF EXISTS public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs DISABLE ROW LEVEL SECURITY;

-- Tasks system
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_attachments DISABLE ROW LEVEL SECURITY;

-- Issues system
ALTER TABLE IF EXISTS public.issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.issue_photos DISABLE ROW LEVEL SECURITY;

-- Notifications
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

-- Activity logs
ALTER TABLE IF EXISTS public.activity_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ALL EXISTING RLS POLICIES
-- ============================================================================

-- Users table
DROP POLICY IF EXISTS "Admin: Full access to users" ON public.users;
DROP POLICY IF EXISTS "Ops: View own profile" ON public.users;

-- Bank accounts and credit cards
DROP POLICY IF EXISTS "Admin: Full access to bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Ops: View own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin: Full access to credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Ops: View own credit cards" ON public.credit_cards;

-- Properties
DROP POLICY IF EXISTS "Admin: Full access to properties" ON public.properties;
DROP POLICY IF EXISTS "Ops: View properties" ON public.properties;
DROP POLICY IF EXISTS "Ops: Create properties" ON public.properties;
DROP POLICY IF EXISTS "Ops: Update properties" ON public.properties;

-- Property Location
DROP POLICY IF EXISTS "Admin: Full access to property_location" ON public.property_location;
DROP POLICY IF EXISTS "Ops: Manage property_location" ON public.property_location;
DROP POLICY IF EXISTS "Ops: Insert property_location" ON public.property_location;
DROP POLICY IF EXISTS "Ops: Update property_location" ON public.property_location;

-- Property Communication
DROP POLICY IF EXISTS "Admin: Full access to property_communication" ON public.property_communication;
DROP POLICY IF EXISTS "Ops: Manage property_communication" ON public.property_communication;
DROP POLICY IF EXISTS "Ops: Insert property_communication" ON public.property_communication;
DROP POLICY IF EXISTS "Ops: Update property_communication" ON public.property_communication;

-- Property Access
DROP POLICY IF EXISTS "Admin: Full access to property_access" ON public.property_access;
DROP POLICY IF EXISTS "Ops: Manage property_access" ON public.property_access;
DROP POLICY IF EXISTS "Ops: Insert property_access" ON public.property_access;
DROP POLICY IF EXISTS "Ops: Update property_access" ON public.property_access;

-- Property Extras
DROP POLICY IF EXISTS "Admin: Full access to property_extras" ON public.property_extras;
DROP POLICY IF EXISTS "Ops: Manage property_extras" ON public.property_extras;
DROP POLICY IF EXISTS "Ops: Insert property_extras" ON public.property_extras;
DROP POLICY IF EXISTS "Ops: Update property_extras" ON public.property_extras;

-- Units
DROP POLICY IF EXISTS "Admin: Full access to units" ON public.units;
DROP POLICY IF EXISTS "Ops: Manage units" ON public.units;
DROP POLICY IF EXISTS "Ops: Insert units" ON public.units;
DROP POLICY IF EXISTS "Ops: Update units" ON public.units;

-- Property Images
DROP POLICY IF EXISTS "Admin: Full access to property_images" ON public.property_images;
DROP POLICY IF EXISTS "Ops: Manage property_images" ON public.property_images;
DROP POLICY IF EXISTS "Ops: Insert property_images" ON public.property_images;
DROP POLICY IF EXISTS "Ops: Update property_images" ON public.property_images;

-- Property Amenities
DROP POLICY IF EXISTS "Admin: Full access to property_amenities" ON public.property_amenities;
DROP POLICY IF EXISTS "Ops: Manage property_amenities" ON public.property_amenities;

-- Property Rules
DROP POLICY IF EXISTS "Admin: Full access to property_rules" ON public.property_rules;
DROP POLICY IF EXISTS "Ops: Manage property_rules" ON public.property_rules;

-- Property Providers
DROP POLICY IF EXISTS "Admin: Full access to property_providers" ON public.property_providers;
DROP POLICY IF EXISTS "Ops: Manage property_providers" ON public.property_providers;

-- Property Vehicles
DROP POLICY IF EXISTS "Admin: Full access to property_vehicles" ON public.property_vehicles;
DROP POLICY IF EXISTS "Ops: Manage property_vehicles" ON public.property_vehicles;

-- Property Checklists
DROP POLICY IF EXISTS "Admin: Full access to property_checklists" ON public.property_checklists;
DROP POLICY IF EXISTS "Ops: Manage property_checklists" ON public.property_checklists;

-- Property Bookings
DROP POLICY IF EXISTS "Admin: Full access to property_bookings" ON public.property_bookings;
DROP POLICY IF EXISTS "Ops: Manage property_bookings" ON public.property_bookings;

-- Property Booking Rates
DROP POLICY IF EXISTS "Admin: Full access to property_booking_rates" ON public.property_booking_rates;
DROP POLICY IF EXISTS "Ops: Manage property_booking_rates" ON public.property_bookings;

-- Property Notes
DROP POLICY IF EXISTS "Admin: Full access to property_notes" ON public.property_notes;
DROP POLICY IF EXISTS "Ops: Manage property_notes" ON public.property_notes;

-- Property QR Codes
DROP POLICY IF EXISTS "Admin: Full access to property_qr_codes" ON public.property_qr_codes;
DROP POLICY IF EXISTS "Ops: Manage property_qr_codes" ON public.property_qr_codes;

-- Financial Entries
DROP POLICY IF EXISTS "Admin: Full access to property_financial_entries" ON public.property_financial_entries;
DROP POLICY IF EXISTS "Ops: View property_financial_entries" ON public.property_financial_entries;

-- Amenities & Rules
DROP POLICY IF EXISTS "Admin: Full access to amenities" ON public.amenities;
DROP POLICY IF EXISTS "Ops: View amenities" ON public.amenities;
DROP POLICY IF EXISTS "Admin: Full access to rules" ON public.rules;
DROP POLICY IF EXISTS "Ops: View rules" ON public.rules;

-- ============================================================================
-- GRANT FULL ACCESS TO AUTHENTICATED USERS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    LOOP
        EXECUTE format('GRANT ALL ON public.%I TO authenticated', r.tablename);
        EXECUTE format('GRANT ALL ON public.%I TO anon', r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- LOG COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS disabled for all tables';
    RAISE NOTICE '✅ All RBAC policies dropped';
    RAISE NOTICE '✅ Full access granted to authenticated and anon roles';
    RAISE NOTICE '⚠️  Authorization is now handled at the application level';
    RAISE NOTICE '⚠️  For production, re-enable RLS and implement proper Supabase Auth';
END $$;
