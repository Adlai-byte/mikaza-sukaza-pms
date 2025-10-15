-- Fix property_images RLS to allow uploads
-- Date: 2025-01-16

-- ============================================
-- DISABLE RLS FOR PROPERTY_IMAGES (DEVELOPMENT)
-- ============================================

-- Disable RLS on property_images table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_images') THEN
        ALTER TABLE public.property_images DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS disabled for property_images table';
    ELSE
        RAISE NOTICE '⚠️  property_images table does not exist';
    END IF;
END $$;

-- Grant full access to authenticated users
GRANT ALL ON public.property_images TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check RLS status
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'property_images';

-- Check grants
SELECT
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'property_images'
  AND grantee = 'authenticated';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Property images upload should now work';
    RAISE NOTICE '⚠️  WARNING: RLS is disabled - FOR DEVELOPMENT ONLY';
    RAISE NOTICE '⚠️  Enable RLS with proper policies before production!';
END $$;
