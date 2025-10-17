-- Diagnostic Script: Check Providers Tables Status
-- Run this in Supabase SQL Editor to see what exists

-- ============================================
-- CHECK WHICH TABLES EXIST
-- ============================================

SELECT
  'Table Exists: ' || tablename as info
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'providers',
    'property_providers_unified',
    'property_providers_new',
    'property_providers',
    'service_providers',
    'utility_providers',
    'service_provider_properties',
    'utility_provider_properties'
  )
ORDER BY tablename;

-- ============================================
-- CHECK PROVIDERS TABLE STRUCTURE
-- ============================================

SELECT
  'providers columns: ' || string_agg(column_name, ', ' ORDER BY ordinal_position) as info
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'providers';

-- ============================================
-- CHECK PROPERTY_PROVIDERS_UNIFIED TABLE STRUCTURE
-- ============================================

SELECT
  'property_providers_unified columns: ' || string_agg(column_name, ', ' ORDER BY ordinal_position) as info
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_providers_unified';

-- ============================================
-- CHECK FOREIGN KEY CONSTRAINTS
-- ============================================

SELECT
  'FK Constraint: ' || conname as info
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid = 'public.property_providers_unified'::regclass;

-- ============================================
-- COUNT PROVIDERS BY CATEGORY
-- ============================================

SELECT
  'Providers count by category: ' || category || ' = ' || count(*) as info
FROM public.providers
GROUP BY category;

-- ============================================
-- SAMPLE QUERY TEST
-- ============================================

-- Try to select from property_providers_unified to see if it works
SELECT
  'property_providers_unified row count: ' || count(*) as info
FROM public.property_providers_unified;
