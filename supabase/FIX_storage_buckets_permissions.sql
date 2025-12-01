-- =====================================================
-- FIX: Storage Buckets Permissions
-- =====================================================
-- This fixes upload/download issues for:
-- - user-avatars (profile images)
-- - property-images (property photos)
-- - property-documents (vehicle documents, etc.)

-- Step 1: Drop all existing storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete documents" ON storage.objects;

-- Step 2: Create permissive policies for all storage buckets
-- These policies allow all authenticated users to upload, view, and delete

-- USER AVATARS BUCKET
CREATE POLICY "Authenticated users: Upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users: View avatars"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users: Update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users: Delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars');

-- PROPERTY IMAGES BUCKET
CREATE POLICY "Authenticated users: Upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Authenticated users: View property images"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users: Update property images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users: Delete property images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-images');

-- PROPERTY DOCUMENTS BUCKET
CREATE POLICY "Authenticated users: Upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-documents');

CREATE POLICY "Authenticated users: View documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-documents');

CREATE POLICY "Authenticated users: Update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-documents');

CREATE POLICY "Authenticated users: Delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-documents');

-- Step 3: Ensure buckets are public (for viewing)
UPDATE storage.buckets
SET public = true
WHERE id IN ('user-avatars', 'property-images', 'property-documents');

-- Step 4: Verify policies
SELECT
  'Storage Policies Created:' as info,
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Storage bucket policies created successfully';
  RAISE NOTICE '✅ Buckets set to public for viewing';
  RAISE NOTICE '🔄 Please refresh your browser to upload/view images';
END $$;
