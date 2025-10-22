-- =====================================================
-- STORAGE BUCKET POLICIES
-- Apply RLS policies for document storage buckets
-- =====================================================
--
-- IMPORTANT: Run this AFTER creating the storage buckets via Dashboard
-- Buckets required: property-documents, employee-documents, message-templates
--
-- =====================================================

-- Enable RLS on storage.objects (should already be enabled, but ensure it)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR STORAGE POLICIES
-- =====================================================

-- Check if user is admin (reuse from documents migration if exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid()
        AND user_type = 'admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is ops (reuse from documents migration if exists)
CREATE OR REPLACE FUNCTION public.is_ops()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid()
        AND user_type IN ('admin', 'ops')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROPERTY-DOCUMENTS BUCKET POLICIES
-- For: contracts, access, coi, service documents
-- =====================================================

-- Policy: Admins have full access to property documents
CREATE POLICY "Admins full access to property-documents"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND public.is_admin()
)
WITH CHECK (
    bucket_id = 'property-documents'
    AND public.is_admin()
);

-- Policy: OPS can upload to property documents
CREATE POLICY "OPS can upload to property-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property-documents'
    AND public.is_ops()
);

-- Policy: OPS can view property documents
CREATE POLICY "OPS can view property-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND public.is_ops()
);

-- Policy: OPS can update property documents
CREATE POLICY "OPS can update property-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND public.is_ops()
)
WITH CHECK (
    bucket_id = 'property-documents'
    AND public.is_ops()
);

-- Policy: OPS can delete property documents
CREATE POLICY "OPS can delete property-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND public.is_ops()
);

-- Policy: Users can view their own uploads
CREATE POLICY "Users view own property-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND owner = auth.uid()
);

-- =====================================================
-- EMPLOYEE-DOCUMENTS BUCKET POLICIES
-- For: employee documents (private, user-specific)
-- =====================================================

-- Policy: Admins have full access to employee documents
CREATE POLICY "Admins full access to employee-documents"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND public.is_admin()
)
WITH CHECK (
    bucket_id = 'employee-documents'
    AND public.is_admin()
);

-- Policy: Users can upload their own employee documents
CREATE POLICY "Users upload own employee-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employee-documents'
    AND owner = auth.uid()
);

-- Policy: Users can view their own employee documents
CREATE POLICY "Users view own employee-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        owner = auth.uid()
        OR (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- Policy: Users can update their own employee documents
CREATE POLICY "Users update own employee-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND owner = auth.uid()
)
WITH CHECK (
    bucket_id = 'employee-documents'
    AND owner = auth.uid()
);

-- Policy: Users can delete their own employee documents
CREATE POLICY "Users delete own employee-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND owner = auth.uid()
);

-- =====================================================
-- MESSAGE-TEMPLATES BUCKET POLICIES
-- For: message templates (admin/ops manage, all view)
-- =====================================================

-- Policy: Admins and OPS have full access to message templates
CREATE POLICY "Admins OPS full access to message-templates"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'message-templates'
    AND public.is_ops()
)
WITH CHECK (
    bucket_id = 'message-templates'
    AND public.is_ops()
);

-- Policy: All authenticated users can view message templates
CREATE POLICY "All users view message-templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'message-templates'
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant storage permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check policies created
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'objects'
-- AND schemaname = 'storage'
-- ORDER BY policyname;

-- =====================================================
-- MIGRATION COMPLETE
-- Storage policies applied for all document buckets
-- =====================================================

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is admin';
COMMENT ON FUNCTION public.is_ops() IS 'Check if current user is admin or ops';
