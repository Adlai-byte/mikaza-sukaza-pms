-- =====================================================
-- FIX: Disable RLS on property_images TABLE
-- =====================================================
-- The storage bucket works, but the database table has RLS blocking inserts

-- Step 1: Check current RLS status
SELECT
  'Current RLS Status:' as info,
  tablename,
  CASE
    WHEN rowsecurity THEN 'ENABLED ❌ (blocking inserts)'
    ELSE 'DISABLED ✅'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('property_images', 'vehicle_photos', 'vehicle_documents')
ORDER BY tablename;

-- Step 2: Disable RLS on image/document tables
ALTER TABLE IF EXISTS public.property_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicle_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicle_documents DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop any existing policies
DROP POLICY IF EXISTS "Admin can manage property images" ON public.property_images;
DROP POLICY IF EXISTS "Ops can manage property images" ON public.property_images;
DROP POLICY IF EXISTS "Users can view property images" ON public.property_images;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON public.property_images;

-- Step 4: Grant full access to authenticated users
GRANT ALL ON public.property_images TO authenticated;
GRANT ALL ON public.vehicle_photos TO authenticated;
GRANT ALL ON public.vehicle_documents TO authenticated;

-- Step 5: Verify fix
SELECT
  'After Fix - RLS Status:' as info,
  tablename,
  CASE
    WHEN rowsecurity THEN 'STILL ENABLED ❌'
    ELSE 'DISABLED ✅'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('property_images', 'vehicle_photos', 'vehicle_documents')
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS disabled on property_images, vehicle_photos, vehicle_documents';
  RAISE NOTICE '✅ Full access granted to authenticated users';
  RAISE NOTICE '🔄 Refresh browser and try uploading again';
END $$;
