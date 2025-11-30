-- =====================================================
-- CREATE VEHICLE DOCUMENTS TABLE
-- =====================================================
-- This table stores documents for vehicles (registration, insurance, etc.)
-- Date: 2025-11-17

-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  document_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.property_vehicles(vehicle_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'registration', 'insurance', 'inspection', 'other'
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER, -- Size in bytes
  mime_type TEXT, -- e.g., 'application/pdf', 'image/jpeg'
  expiry_date DATE, -- For documents that expire (registration, insurance)
  notes TEXT,
  uploaded_by UUID REFERENCES public.users(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id
ON public.vehicle_documents(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_document_type
ON public.vehicle_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry_date
ON public.vehicle_documents(expiry_date)
WHERE expiry_date IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view vehicle documents" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Admins can manage all vehicle documents" ON public.vehicle_documents;
DROP POLICY IF EXISTS "OPS can manage vehicle documents" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Users can upload vehicle documents" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Users can delete their own vehicle documents" ON public.vehicle_documents;

-- RLS Policies

-- Allow authenticated users to view vehicle documents
CREATE POLICY "Users can view vehicle documents"
ON public.vehicle_documents FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage all vehicle documents
CREATE POLICY "Admins can manage all vehicle documents"
ON public.vehicle_documents FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow OPS to upload and update vehicle documents
CREATE POLICY "OPS can manage vehicle documents"
ON public.vehicle_documents FOR ALL
TO authenticated
USING (public.is_admin_or_ops())
WITH CHECK (public.is_admin_or_ops());

-- Allow users to upload documents
CREATE POLICY "Users can upload vehicle documents"
ON public.vehicle_documents FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own vehicle documents"
ON public.vehicle_documents FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_vehicle_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vehicle_documents_updated_at ON public.vehicle_documents;
CREATE TRIGGER trigger_update_vehicle_documents_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_documents_updated_at();

-- Add comments
COMMENT ON TABLE public.vehicle_documents IS 'Stores documents for vehicles (registration, insurance, inspection certificates, etc.)';
COMMENT ON COLUMN public.vehicle_documents.document_type IS 'Type of document: registration, insurance, inspection, other';
COMMENT ON COLUMN public.vehicle_documents.document_name IS 'User-friendly name for the document';
COMMENT ON COLUMN public.vehicle_documents.document_url IS 'URL to the document in storage';
COMMENT ON COLUMN public.vehicle_documents.expiry_date IS 'Expiry date for documents like registration or insurance';
COMMENT ON COLUMN public.vehicle_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.vehicle_documents.mime_type IS 'MIME type of the document (e.g., application/pdf, image/jpeg)';
