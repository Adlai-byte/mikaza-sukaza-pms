-- =====================================================
-- EMERGENCY FIX: Disable RLS on "providers" table
-- =====================================================

-- Step 1: Check RLS status on providers-related tables
SELECT
  'Current RLS Status:' as info,
  tablename,
  CASE
    WHEN rowsecurity THEN 'ENABLED ❌ (blocking inserts)'
    ELSE 'DISABLED ✅'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%provider%'
ORDER BY tablename;

-- Step 2: Disable RLS on ALL provider-related tables
ALTER TABLE IF EXISTS public.providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.utility_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_cois DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_providers DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant full access
GRANT ALL ON public.providers TO authenticated;
GRANT ALL ON public.providers TO anon;
GRANT ALL ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO anon;
GRANT ALL ON public.utility_providers TO authenticated;
GRANT ALL ON public.utility_providers TO anon;
GRANT ALL ON public.provider_cois TO authenticated;
GRANT ALL ON public.provider_cois TO anon;
GRANT ALL ON public.property_providers TO authenticated;
GRANT ALL ON public.property_providers TO anon;

-- Step 4: Verify fix
SELECT
  'After Fix - RLS Status:' as info,
  tablename,
  CASE
    WHEN rowsecurity THEN 'STILL ENABLED ❌'
    ELSE 'DISABLED ✅'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%provider%'
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS disabled on all provider tables';
  RAISE NOTICE '✅ Full access granted';
  RAISE NOTICE '🔄 Refresh browser and try creating a provider again';
END $$;
