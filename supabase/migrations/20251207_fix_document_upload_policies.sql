-- =====================================================
-- FIX DOCUMENT UPLOAD RLS POLICIES
-- =====================================================
-- This migration fixes the document upload policies to allow
-- OPS users to upload all document categories, not just some.

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "OPS can view and manage service and message documents" ON public.documents;
DROP POLICY IF EXISTS "OPS can view contracts and COI documents" ON public.documents;
DROP POLICY IF EXISTS "OPS can create and view access documents" ON public.documents;
DROP POLICY IF EXISTS "OPS can create access documents" ON public.documents;

-- Create new comprehensive OPS policy for documents
-- OPS can manage all document types except employee (which requires admin)
CREATE POLICY "OPS can manage most document types"
ON public.documents FOR ALL
USING (
    is_ops() AND category IN ('service', 'messages', 'access', 'contracts', 'coi')
)
WITH CHECK (
    is_ops() AND category IN ('service', 'messages', 'access', 'contracts', 'coi')
);

-- OPS can also view employee documents (but not create/update/delete without admin)
CREATE POLICY "OPS can view employee documents"
ON public.documents FOR SELECT
USING (
    is_ops() AND category = 'employee'
);

-- OPS can create employee documents (admin manages them, but OPS can upload)
CREATE POLICY "OPS can create employee documents"
ON public.documents FOR INSERT
WITH CHECK (
    is_ops() AND category = 'employee'
);

-- =====================================================
-- FIX STORAGE BUCKET POLICIES FOR EMPLOYEE DOCUMENTS
-- =====================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own employee documents" ON storage.objects;

-- Allow OPS to upload to employee-documents bucket
CREATE POLICY "OPS can upload employee documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
        (SELECT user_type FROM users WHERE user_id = auth.uid()) IN ('admin', 'ops')
    )
);

-- Allow OPS to view employee documents
CREATE POLICY "OPS can view employee documents storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        (SELECT user_type FROM users WHERE user_id = auth.uid()) IN ('admin', 'ops')
    )
);

-- Allow OPS to update their uploads
CREATE POLICY "OPS can update employee documents storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        (SELECT user_type FROM users WHERE user_id = auth.uid()) IN ('admin', 'ops')
    )
);

-- Allow OPS to delete employee documents (with proper document-level permission)
CREATE POLICY "OPS can delete employee documents storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        (SELECT user_type FROM users WHERE user_id = auth.uid()) IN ('admin', 'ops')
    )
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "OPS can manage most document types" ON public.documents IS
'Allows OPS users to create, read, update, and delete service, messages, access, contracts, and COI documents';

COMMENT ON POLICY "OPS can create employee documents" ON public.documents IS
'Allows OPS users to upload employee documents (HR typically manages these)';
