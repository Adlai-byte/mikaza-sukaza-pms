-- Update document_summary view to include contract_type
-- Must drop and recreate to add columns in the middle

DROP VIEW IF EXISTS document_summary;

CREATE VIEW document_summary AS
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
    END as expiring_soon,
    -- New columns added at the end
    d.file_url,
    d.parent_document_id,
    d.contract_type
FROM public.documents d
LEFT JOIN public.properties p ON d.property_id = p.property_id
LEFT JOIN public.users u ON d.uploaded_by = u.user_id;
