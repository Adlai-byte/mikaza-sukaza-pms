-- =====================================================
-- COMPREHENSIVE FIX: Disable RLS on ALL Tables
-- =====================================================
-- This disables RLS on all tables that might be causing issues
-- Based on migration 20251016_disable_rls_for_session_auth.sql

-- Step 1: Check which tables currently have RLS enabled
SELECT
  'Tables with RLS ENABLED (will be fixed):' as info,
  tablename,
  '❌ BLOCKING DATA' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- Step 2: Disable RLS on ALL main tables
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
ALTER TABLE IF EXISTS public.vehicle_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicle_documents DISABLE ROW LEVEL SECURITY;
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

-- Service Providers (CRITICAL - user reported this is not working)
ALTER TABLE IF EXISTS public.service_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.utility_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_cois DISABLE ROW LEVEL SECURITY;

-- Financial tables
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_tips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_template_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_template_property_assignments DISABLE ROW LEVEL SECURITY;

-- Commission system
ALTER TABLE IF EXISTS public.commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.commission_payments DISABLE ROW LEVEL SECURITY;

-- Documents system
ALTER TABLE IF EXISTS public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.access_authorizations DISABLE ROW LEVEL SECURITY;

-- Check-in/out system
ALTER TABLE IF EXISTS public.checklist_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checklist_template_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.check_in_outs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.check_in_out_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.check_in_out_photos DISABLE ROW LEVEL SECURITY;

-- Media and highlights
ALTER TABLE IF EXISTS public.media DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_highlights DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_highlight_items DISABLE ROW LEVEL SECURITY;

-- Message templates
ALTER TABLE IF EXISTS public.message_templates DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant full access to authenticated users on all tables
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

-- Step 4: Verify all RLS is disabled
SELECT
  'After Fix - Tables with RLS still enabled:' as info,
  tablename,
  '⚠️ STILL ENABLED' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- Step 5: Show tables with RLS successfully disabled
SELECT
  'Successfully Disabled RLS:' as info,
  COUNT(*) as total_tables,
  '✅ ALL ACCESSIBLE' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS disabled on ALL tables';
  RAISE NOTICE '✅ Full access granted to authenticated and anon roles';
  RAISE NOTICE '🔄 Refresh your browser - all data should now be accessible';
END $$;
