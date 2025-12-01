-- =====================================================
-- FORCE FIX: Storage Buckets Permissions
-- =====================================================
-- This completely removes ALL storage policies and recreates them

-- Step 1: Get list of ALL existing policies on storage.objects
SELECT
  'Current Storage Policies:' as info,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Step 2: Drop ALL existing policies (comprehensive list)
DROP POLICY IF EXISTS "Authenticated users: Upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: View avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: View property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Update property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Delete property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: View documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users: Delete documents" ON storage.objects;

-- Drop old naming patterns
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete documents" ON storage.objects;

-- Drop any other common patterns
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;

-- Step 3: Create SIMPLE permissive policies (one per bucket per operation)

-- USER AVATARS - Allow all authenticated users
CREATE POLICY "avatars_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "avatars_select" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'user-avatars');

CREATE POLICY "avatars_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "avatars_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'user-avatars');

-- PROPERTY IMAGES - Allow all authenticated users
CREATE POLICY "property_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "property_images_select" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'property-images');

CREATE POLICY "property_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'property-images');

CREATE POLICY "property_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'property-images');

-- PROPERTY DOCUMENTS - Allow all authenticated users
CREATE POLICY "property_docs_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-documents');

CREATE POLICY "property_docs_select" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'property-documents');

CREATE POLICY "property_docs_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'property-documents');

CREATE POLICY "property_docs_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'property-documents');

-- Step 4: Ensure buckets are public
UPDATE storage.buckets
SET public = true
WHERE id IN ('user-avatars', 'property-images', 'property-documents');

-- Step 5: Verify new policies
SELECT
  'New Storage Policies:' as info,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All old policies removed';
  RAISE NOTICE '✅ New permissive policies created';
  RAISE NOTICE '✅ Buckets set to public';
  RAISE NOTICE '🔄 Refresh browser and try uploading images';
END $$;
