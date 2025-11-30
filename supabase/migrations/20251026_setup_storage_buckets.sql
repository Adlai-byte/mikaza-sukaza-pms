-- =====================================================
-- CREATE STORAGE BUCKETS FOR DOCUMENTS
-- =====================================================

-- Create property-documents bucket (for contracts, access, coi, service)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

-- Create employee-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

-- Create message-templates bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-templates',
  'message-templates',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/plain',
    'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- =====================================================
-- STORAGE POLICIES FOR PROPERTY-DOCUMENTS BUCKET
-- =====================================================

-- Admins have full access to property documents
CREATE POLICY "Admins have full access to property documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'property-documents'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'property-documents'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) = 'admin'
  )
);

-- OPS can view and upload property documents
CREATE POLICY "OPS can view property documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-documents'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) IN ('admin', 'ops')
  )
);

CREATE POLICY "OPS can upload property documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-documents'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) IN ('admin', 'ops')
  )
);

-- Users can view their own uploads
CREATE POLICY "Users can view their own property documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-documents'
  AND owner = auth.uid()
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own property documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-documents'
  AND owner = auth.uid()
);

-- =====================================================
-- STORAGE POLICIES FOR EMPLOYEE-DOCUMENTS BUCKET
-- =====================================================

-- Admins have full access to employee documents
CREATE POLICY "Admins have full access to employee documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) = 'admin'
  )
);

-- Users can view their own employee documents
CREATE POLICY "Users can view their own employee documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- STORAGE POLICIES FOR MESSAGE-TEMPLATES BUCKET
-- =====================================================

-- Admins and OPS can manage templates
CREATE POLICY "Admins and OPS can manage message templates"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'message-templates'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) IN ('admin', 'ops')
  )
)
WITH CHECK (
  bucket_id = 'message-templates'
  AND (
    (SELECT user_type FROM users WHERE user_id = auth.uid()::text) IN ('admin', 'ops')
  )
);

-- All authenticated users can view templates
CREATE POLICY "All users can view message templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-templates'
  AND auth.role() = 'authenticated'
);
