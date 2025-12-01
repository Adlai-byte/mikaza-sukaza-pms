-- =====================================================
-- DIAGNOSTIC AND FIX: Properties Data Access Issue
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
--
-- This will:
-- 1. Check if properties exist in database
-- 2. Check RLS status
-- 3. Fix RLS if needed
-- 4. Show sample property data

-- Step 1: Count properties in database
SELECT
  'Total properties in database:' as info,
  COUNT(*) as count
FROM public.properties;

-- Step 2: Check RLS status on critical tables
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN 'ENABLED ❌'
    ELSE 'DISABLED ✅'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('properties', 'property_location', 'users', 'vehicle_documents')
ORDER BY tablename;

-- Step 3: Show sample property data (first 3 properties)
SELECT
  property_id,
  property_name,
  property_type,
  owner_id,
  is_active,
  created_at
FROM public.properties
ORDER BY created_at DESC
LIMIT 3;

-- =====================================================
-- FIX: Disable RLS on properties table if enabled
-- =====================================================

-- Disable RLS on properties table
ALTER TABLE IF EXISTS public.properties DISABLE ROW LEVEL SECURITY;

-- Disable RLS on property_location table
ALTER TABLE IF EXISTS public.property_location DISABLE ROW LEVEL SECURITY;

-- Disable RLS on users table
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.property_location TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- Verify fix
SELECT
  'After Fix - RLS Status:' as info,
  tablename,
  CASE
    WHEN rowsecurity THEN 'ENABLED ❌'
    ELSE 'DISABLED ✅'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('properties', 'property_location', 'users')
ORDER BY tablename;

-- Show message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS has been disabled on properties, property_location, and users tables';
  RAISE NOTICE '✅ Full access granted to authenticated users';
  RAISE NOTICE '🔄 Please refresh your browser to see the changes';
END $$;
