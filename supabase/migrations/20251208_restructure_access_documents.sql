-- Migration: Restructure Access Authorization to Access Documents
-- This transforms the access authorization module from a workflow system to a simple document storage system

-- Step 1: Create access_documents table for storing access-related documents
CREATE TABLE IF NOT EXISTS access_documents (
    access_document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Optional relationships
    property_id UUID REFERENCES properties(property_id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES providers(provider_id) ON DELETE SET NULL,

    -- Document information
    document_type TEXT NOT NULL CHECK (document_type IN ('access_card', 'code', 'key', 'permit', 'other')),
    document_name TEXT NOT NULL,
    description TEXT,

    -- File information
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,

    -- Expiration
    expiry_date DATE,

    -- Tags for organization
    tags TEXT[],

    -- Audit fields
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for common queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_access_documents_property') THEN
        CREATE INDEX idx_access_documents_property ON access_documents(property_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_access_documents_vendor') THEN
        CREATE INDEX idx_access_documents_vendor ON access_documents(vendor_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_access_documents_type') THEN
        CREATE INDEX idx_access_documents_type ON access_documents(document_type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_access_documents_expiry') THEN
        CREATE INDEX idx_access_documents_expiry ON access_documents(expiry_date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_access_documents_created') THEN
        CREATE INDEX idx_access_documents_created ON access_documents(created_at DESC);
    END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE access_documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if any
DROP POLICY IF EXISTS "Admin full access to access_documents" ON access_documents;
DROP POLICY IF EXISTS "Ops can manage access_documents" ON access_documents;
DROP POLICY IF EXISTS "Providers can view their access_documents" ON access_documents;

-- Step 5: Create RLS policies
-- Admins have full access
CREATE POLICY "Admin full access to access_documents" ON access_documents
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Ops users can manage all access documents
CREATE POLICY "Ops can manage access_documents" ON access_documents
    FOR ALL
    TO authenticated
    USING (public.is_ops())
    WITH CHECK (public.is_ops());

-- Providers can view their own access documents
CREATE POLICY "Providers can view their access_documents" ON access_documents
    FOR SELECT
    TO authenticated
    USING (
        public.get_user_role() = 'provider' AND
        vendor_id IN (
            SELECT provider_id FROM providers WHERE email = (
                SELECT email FROM users WHERE user_id = auth.uid()
            )
        )
    );

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_access_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_access_documents_updated_at ON access_documents;
CREATE TRIGGER trigger_access_documents_updated_at
    BEFORE UPDATE ON access_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_access_documents_updated_at();

-- Step 7: Create a view for access documents with related data
CREATE OR REPLACE VIEW access_documents_view AS
SELECT
    ad.*,
    p.property_name,
    p.property_type,
    pr.provider_name AS vendor_name,
    pr.provider_type AS vendor_type,
    u.first_name AS uploaded_by_first_name,
    u.last_name AS uploaded_by_last_name,
    CASE
        WHEN ad.expiry_date IS NOT NULL AND ad.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN ad.expiry_date IS NOT NULL AND ad.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'active'
    END AS status
FROM access_documents ad
LEFT JOIN properties p ON ad.property_id = p.property_id
LEFT JOIN providers pr ON ad.vendor_id = pr.provider_id
LEFT JOIN users u ON ad.uploaded_by = u.user_id;

-- Step 8: Add comments
COMMENT ON TABLE access_documents IS 'Stores access-related documents like access cards, codes, keys, permits';
COMMENT ON COLUMN access_documents.document_type IS 'Type of access document: access_card, code, key, permit, other';
COMMENT ON COLUMN access_documents.property_id IS 'Optional: Link to specific property';
COMMENT ON COLUMN access_documents.vendor_id IS 'Optional: Link to specific vendor/provider';
