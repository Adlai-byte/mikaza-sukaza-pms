-- =====================================================
-- CHECK AND CREATE: Storage Buckets
-- =====================================================

-- Step 1: Check which buckets exist
SELECT
  'Existing Storage Buckets:' as info,
  id as bucket_name,
  public as is_public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY id;

-- Step 2: Create missing buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('property-documents', 'property-documents', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 3: Verify buckets after creation
SELECT
  'After Creation - Storage Buckets:' as info,
  id as bucket_name,
  public as is_public,
  CASE
    WHEN public THEN '✅ PUBLIC'
    ELSE '❌ PRIVATE'
  END as status
FROM storage.buckets
WHERE id IN ('user-avatars', 'property-images', 'property-documents')
ORDER BY id;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Storage buckets verified/created';
  RAISE NOTICE '📋 Next step: Run FIX_storage_buckets_permissions.sql';
END $$;
