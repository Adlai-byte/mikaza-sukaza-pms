-- =====================================================
-- DOCUMENTS MANAGEMENT SYSTEM
-- Complete document storage with versioning, approvals, and audit trail
-- =====================================================

-- =====================================================
-- 1. DOCUMENTS TABLE
-- Core document storage with version control
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Categorization
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'contracts',
        'employee',
        'access',
        'coi',
        'service',
        'messages'
    )),

    -- Basic Information
    document_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- File Information
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- MIME type
    file_size BIGINT NOT NULL, -- bytes

    -- Version Control
    version_number INTEGER NOT NULL DEFAULT 1,
    is_current_version BOOLEAN NOT NULL DEFAULT true,
    parent_document_id UUID REFERENCES public.documents(document_id) ON DELETE SET NULL,

    -- Associations
    property_id UUID REFERENCES public.properties(property_id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'draft',
        'active',
        'archived',
        'expired'
    )),

    -- Expiry Tracking (for COIs, contracts)
    expiry_date DATE,

    -- Tagging and Search
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Metadata
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT positive_file_size CHECK (file_size > 0),
    CONSTRAINT positive_version CHECK (version_number > 0)
);

-- Indexes for documents
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_property_id ON public.documents(property_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_expiry_date ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_current_version ON public.documents(is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_documents_parent_document ON public.documents(parent_document_id);
CREATE INDEX idx_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. DOCUMENT ACCESS LOG TABLE
-- Immutable audit trail for document access
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_access_log (
    access_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was accessed
    document_id UUID NOT NULL REFERENCES public.documents(document_id) ON DELETE CASCADE,

    -- Who accessed it
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),

    -- Action performed
    action VARCHAR(20) NOT NULL CHECK (action IN (
        'viewed',
        'downloaded',
        'uploaded',
        'deleted',
        'updated',
        'shared',
        'unshared'
    )),

    -- Access context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp (immutable)
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CONSTRAINT no_future_access CHECK (accessed_at <= CURRENT_TIMESTAMP)
);

-- Indexes for access log
CREATE INDEX idx_access_log_document_id ON public.document_access_log(document_id);
CREATE INDEX idx_access_log_user_id ON public.document_access_log(user_id);
CREATE INDEX idx_access_log_action ON public.document_access_log(action);
CREATE INDEX idx_access_log_accessed_at ON public.document_access_log(accessed_at DESC);

-- Make access log immutable (no updates or deletes allowed)
CREATE OR REPLACE FUNCTION prevent_access_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Access log records cannot be modified or deleted';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_access_log_update
    BEFORE UPDATE ON public.document_access_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_access_log_modification();

CREATE TRIGGER trigger_prevent_access_log_delete
    BEFORE DELETE ON public.document_access_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_access_log_modification();

-- =====================================================
-- 3. DOCUMENT APPROVALS TABLE
-- Workflow for access authorization documents
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_approvals (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Document reference
    document_id UUID NOT NULL REFERENCES public.documents(document_id) ON DELETE CASCADE,

    -- Workflow
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected'
    )),

    -- Dates
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP WITH TIME ZONE,

    -- Details
    rejection_reason TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for approvals
CREATE INDEX idx_approvals_document_id ON public.document_approvals(document_id);
CREATE INDEX idx_approvals_requested_by ON public.document_approvals(requested_by);
CREATE INDEX idx_approvals_approved_by ON public.document_approvals(approved_by);
CREATE INDEX idx_approvals_status ON public.document_approvals(status);
CREATE INDEX idx_approvals_request_date ON public.document_approvals(request_date DESC);

-- Trigger to update updated_at
CREATE TRIGGER trigger_approvals_updated_at
    BEFORE UPDATE ON public.document_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set approval_date when approved/rejected
CREATE OR REPLACE FUNCTION set_approval_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
        NEW.approval_date = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_approval_date
    BEFORE UPDATE ON public.document_approvals
    FOR EACH ROW
    EXECUTE FUNCTION set_approval_date();

-- =====================================================
-- 4. DOCUMENT SHARES TABLE
-- Share documents with specific users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_shares (
    share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Document reference
    document_id UUID NOT NULL REFERENCES public.documents(document_id) ON DELETE CASCADE,

    -- Sharing details
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Permission level
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission_level IN (
        'view',
        'download',
        'edit'
    )),

    -- Expiry
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_share UNIQUE (document_id, shared_with),
    CONSTRAINT no_self_share CHECK (shared_by != shared_with)
);

-- Indexes for shares
CREATE INDEX idx_shares_document_id ON public.document_shares(document_id);
CREATE INDEX idx_shares_shared_by ON public.document_shares(shared_by);
CREATE INDEX idx_shares_shared_with ON public.document_shares(shared_with);
CREATE INDEX idx_shares_expires_at ON public.document_shares(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Secure access to documents
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
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

-- Helper function to check if user is ops
CREATE OR REPLACE FUNCTION is_ops()
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

-- Documents policies
CREATE POLICY "Admins have full access to all documents"
    ON public.documents FOR ALL
    USING (is_admin());

CREATE POLICY "OPS can view and manage service and message documents"
    ON public.documents FOR ALL
    USING (
        is_ops() AND category IN ('service', 'messages')
    );

CREATE POLICY "OPS can view contracts and COI documents"
    ON public.documents FOR SELECT
    USING (
        is_ops() AND category IN ('contracts', 'coi')
    );

CREATE POLICY "OPS can create and view access documents"
    ON public.documents FOR SELECT
    USING (
        is_ops() AND category = 'access'
    );

CREATE POLICY "OPS can create access documents"
    ON public.documents FOR INSERT
    WITH CHECK (
        is_ops() AND category = 'access'
    );

CREATE POLICY "Users can view documents shared with them"
    ON public.documents FOR SELECT
    USING (
        document_id IN (
            SELECT document_id FROM public.document_shares
            WHERE shared_with = auth.uid()
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        )
    );

CREATE POLICY "Users can view their own uploaded documents"
    ON public.documents FOR SELECT
    USING (uploaded_by = auth.uid());

-- Access log policies (read-only)
CREATE POLICY "Admins can view all access logs"
    ON public.document_access_log FOR SELECT
    USING (is_admin());

CREATE POLICY "Users can view access logs for their documents"
    ON public.document_access_log FOR SELECT
    USING (
        document_id IN (
            SELECT document_id FROM public.documents
            WHERE uploaded_by = auth.uid()
        )
    );

-- Approvals policies
CREATE POLICY "Admins can manage all approvals"
    ON public.document_approvals FOR ALL
    USING (is_admin());

CREATE POLICY "OPS can view and approve access approvals"
    ON public.document_approvals FOR ALL
    USING (
        is_ops() AND
        document_id IN (
            SELECT document_id FROM public.documents WHERE category = 'access'
        )
    );

CREATE POLICY "Users can view their own approval requests"
    ON public.document_approvals FOR SELECT
    USING (requested_by = auth.uid());

CREATE POLICY "Users can create approval requests"
    ON public.document_approvals FOR INSERT
    WITH CHECK (requested_by = auth.uid());

-- Shares policies
CREATE POLICY "Admins can manage all shares"
    ON public.document_shares FOR ALL
    USING (is_admin());

CREATE POLICY "Users can view shares they created or received"
    ON public.document_shares FOR SELECT
    USING (shared_by = auth.uid() OR shared_with = auth.uid());

CREATE POLICY "Users can create shares for their documents"
    ON public.document_shares FOR INSERT
    WITH CHECK (
        shared_by = auth.uid() AND
        document_id IN (
            SELECT document_id FROM public.documents
            WHERE uploaded_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete shares they created"
    ON public.document_shares FOR DELETE
    USING (shared_by = auth.uid());

-- =====================================================
-- 6. HELPER VIEWS
-- Convenient views for common queries
-- =====================================================

-- View: Document summary with user details
CREATE OR REPLACE VIEW document_summary AS
SELECT
    d.document_id,
    d.category,
    d.document_name,
    d.description,
    d.file_name,
    d.file_type,
    d.file_size,
    d.version_number,
    d.is_current_version,
    d.property_id,
    p.property_name,
    d.status,
    d.expiry_date,
    d.tags,
    d.uploaded_by,
    u.first_name || ' ' || u.last_name as uploaded_by_name,
    d.created_at,
    d.updated_at,
    -- Count shares
    (SELECT COUNT(*) FROM public.document_shares WHERE document_id = d.document_id) as share_count,
    -- Check if expiring soon (within 30 days)
    CASE
        WHEN d.expiry_date IS NOT NULL AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN true
        ELSE false
    END as expiring_soon
FROM public.documents d
LEFT JOIN public.properties p ON d.property_id = p.property_id
LEFT JOIN public.users u ON d.uploaded_by = u.user_id;

-- View: Document stats by category
CREATE OR REPLACE VIEW document_stats_by_category AS
SELECT
    category,
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE is_current_version = true) as current_versions,
    COUNT(*) FILTER (WHERE status = 'active') as active_documents,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_documents,
    COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date > CURRENT_DATE) as expiring_soon,
    SUM(file_size) as total_storage_bytes,
    AVG(file_size) as avg_file_size_bytes
FROM public.documents
GROUP BY category;

-- View: Recent document activity
CREATE OR REPLACE VIEW recent_document_activity AS
SELECT
    dal.access_log_id,
    dal.document_id,
    d.document_name,
    d.category,
    dal.action,
    dal.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    dal.accessed_at
FROM public.document_access_log dal
LEFT JOIN public.documents d ON dal.document_id = d.document_id
LEFT JOIN public.users u ON dal.user_id = u.user_id
ORDER BY dal.accessed_at DESC
LIMIT 100;

-- View: Pending approvals
CREATE OR REPLACE VIEW pending_approvals AS
SELECT
    da.approval_id,
    da.document_id,
    d.document_name,
    d.category,
    da.requested_by,
    ru.first_name || ' ' || ru.last_name as requested_by_name,
    ru.email as requested_by_email,
    da.request_date,
    da.notes
FROM public.document_approvals da
LEFT JOIN public.documents d ON da.document_id = d.document_id
LEFT JOIN public.users ru ON da.requested_by = ru.user_id
WHERE da.status = 'pending'
ORDER BY da.request_date ASC;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to log document access
CREATE OR REPLACE FUNCTION log_document_access(
    p_document_id UUID,
    p_action VARCHAR(20)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.document_access_log (
        document_id,
        user_id,
        user_email,
        action,
        accessed_at
    ) VALUES (
        p_document_id,
        auth.uid(),
        auth.jwt()->>'email',
        p_action,
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new document version
CREATE OR REPLACE FUNCTION create_document_version(
    p_parent_document_id UUID,
    p_file_url TEXT,
    p_file_name VARCHAR(255),
    p_file_type VARCHAR(50),
    p_file_size BIGINT
)
RETURNS UUID AS $$
DECLARE
    v_new_document_id UUID;
    v_new_version_number INTEGER;
    v_category VARCHAR(50);
    v_document_name VARCHAR(255);
    v_description TEXT;
    v_property_id UUID;
    v_tags TEXT[];
BEGIN
    -- Get parent document details
    SELECT
        category,
        document_name,
        description,
        property_id,
        tags,
        version_number + 1
    INTO
        v_category,
        v_document_name,
        v_description,
        v_property_id,
        v_tags,
        v_new_version_number
    FROM public.documents
    WHERE document_id = p_parent_document_id
    AND is_current_version = true;

    -- Mark old version as not current
    UPDATE public.documents
    SET is_current_version = false
    WHERE document_id = p_parent_document_id;

    -- Create new version
    INSERT INTO public.documents (
        category,
        document_name,
        description,
        file_url,
        file_name,
        file_type,
        file_size,
        version_number,
        is_current_version,
        parent_document_id,
        property_id,
        status,
        tags,
        uploaded_by
    ) VALUES (
        v_category,
        v_document_name,
        v_description,
        p_file_url,
        p_file_name,
        p_file_type,
        p_file_size,
        v_new_version_number,
        true,
        p_parent_document_id,
        v_property_id,
        'active',
        v_tags,
        auth.uid()
    )
    RETURNING document_id INTO v_new_document_id;

    -- Log the upload
    PERFORM log_document_access(v_new_document_id, 'uploaded');

    RETURN v_new_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- Tables: documents, document_access_log, document_approvals, document_shares
-- Features: Version control, approval workflow, access audit, RLS policies
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT ON public.document_access_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.document_approvals TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.document_shares TO authenticated;

-- Grant usage on views
GRANT SELECT ON document_summary TO authenticated;
GRANT SELECT ON document_stats_by_category TO authenticated;
GRANT SELECT ON recent_document_activity TO authenticated;
GRANT SELECT ON pending_approvals TO authenticated;

-- Comments
COMMENT ON TABLE public.documents IS 'Document storage with version control and categorization';
COMMENT ON TABLE public.document_access_log IS 'Immutable audit trail for all document access';
COMMENT ON TABLE public.document_approvals IS 'Approval workflow for access authorization documents';
COMMENT ON TABLE public.document_shares IS 'Share documents with specific users with permission levels';
