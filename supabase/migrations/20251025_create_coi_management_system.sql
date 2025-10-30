-- =====================================================
-- COI (CERTIFICATE OF INSURANCE) MANAGEMENT SYSTEM - FIXED
-- Vendor insurance tracking, building requirements, and access authorizations
--
-- FIX: Changed all auth.users(id) references to public.users(user_id)
-- This allows PostgREST to properly expose the foreign key relationships
-- =====================================================

-- =====================================================
-- 1. VENDOR COIs TABLE
-- Track insurance certificates for all vendors
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vendor_cois (
    coi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vendor Association
    vendor_id UUID REFERENCES public.providers(provider_id) ON DELETE CASCADE,

    -- Building/Property Association (COI may be building-specific)
    property_id UUID REFERENCES public.properties(property_id) ON DELETE SET NULL,

    -- Insurance Information
    insurance_company VARCHAR(255),
    policy_number VARCHAR(100),
    coverage_type VARCHAR(50) NOT NULL CHECK (coverage_type IN (
        'general_liability',
        'workers_compensation',
        'auto_liability',
        'professional_liability',
        'umbrella',
        'other'
    )),
    coverage_amount NUMERIC(12, 2) NOT NULL,

    -- Validity Period
    valid_from DATE NOT NULL,
    valid_through DATE NOT NULL,

    -- Document Storage
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,

    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',
        'expiring_soon',  -- 30 days or less
        'expired',
        'renewed',
        'cancelled'
    )),

    -- Alert Tracking
    alert_30_days_sent BOOLEAN DEFAULT false,
    alert_15_days_sent BOOLEAN DEFAULT false,
    alert_7_days_sent BOOLEAN DEFAULT false,
    alert_expired_sent BOOLEAN DEFAULT false,

    -- Metadata
    notes TEXT,
    uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_date_range CHECK (valid_through > valid_from),
    CONSTRAINT positive_coverage CHECK (coverage_amount > 0)
);

-- Indexes for vendor_cois
CREATE INDEX idx_vendor_cois_vendor_id ON public.vendor_cois(vendor_id);
CREATE INDEX idx_vendor_cois_property_id ON public.vendor_cois(property_id);
CREATE INDEX idx_vendor_cois_status ON public.vendor_cois(status);
CREATE INDEX idx_vendor_cois_valid_through ON public.vendor_cois(valid_through);
CREATE INDEX idx_vendor_cois_coverage_type ON public.vendor_cois(coverage_type);
CREATE INDEX idx_vendor_cois_created_at ON public.vendor_cois(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER trigger_vendor_cois_updated_at
    BEFORE UPDATE ON public.vendor_cois
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. BUILDING COIs TABLE
-- Master requirements for each building/property
-- =====================================================
CREATE TABLE IF NOT EXISTS public.building_cois (
    building_coi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Property Association
    property_id UUID REFERENCES public.properties(property_id) ON DELETE CASCADE,

    -- Insurance Requirements (stored as JSONB for flexibility)
    required_coverages JSONB NOT NULL DEFAULT '{}',
    -- Example structure:
    -- {
    --   "general_liability": {"min_amount": 1000000, "required": true},
    --   "workers_compensation": {"min_amount": 500000, "required": true},
    --   "auto_liability": {"min_amount": 1000000, "required": false}
    -- }

    -- Building Policies & Contacts
    access_policies TEXT,
    service_elevator_rules TEXT,
    loading_dock_rules TEXT,
    parking_instructions TEXT,

    -- Building Management Contact
    building_manager_name VARCHAR(255),
    building_manager_email VARCHAR(255),
    building_manager_phone VARCHAR(50),
    building_management_company VARCHAR(255),

    -- Emergency Contacts
    emergency_contact JSONB DEFAULT '[]',
    -- Example: [{"name": "John Doe", "role": "Security", "phone": "555-0100"}]

    -- Operating Hours & Access
    office_hours TEXT,
    after_hours_contact VARCHAR(100),
    security_requirements TEXT,

    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for building_cois
CREATE INDEX idx_building_cois_property_id ON public.building_cois(property_id);
CREATE INDEX idx_building_cois_created_at ON public.building_cois(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER trigger_building_cois_updated_at
    BEFORE UPDATE ON public.building_cois
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. ACCESS AUTHORIZATIONS TABLE
-- Track vendor access requests and approvals
-- =====================================================
CREATE TABLE IF NOT EXISTS public.access_authorizations (
    access_auth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Associations
    vendor_id UUID REFERENCES public.providers(provider_id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(property_id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(unit_id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.jobs(job_id) ON DELETE SET NULL,
    coi_id UUID REFERENCES public.vendor_cois(coi_id) ON DELETE SET NULL,

    -- Access Details
    access_date DATE NOT NULL,
    access_time_start TIME,
    access_time_end TIME,
    authorized_areas TEXT[], -- Array of areas: ["unit", "lobby", "service_elevator", "loading_dock"]

    -- Authorization Status
    status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN (
        'requested',
        'approved',
        'in_progress',
        'completed',
        'cancelled',
        'expired'
    )),

    -- Access Control
    access_code VARCHAR(50),
    qr_code_url TEXT,
    key_pickup_location VARCHAR(255),

    -- Vendor Personnel
    vendor_contact_name VARCHAR(255),
    vendor_contact_phone VARCHAR(50),
    number_of_personnel INTEGER DEFAULT 1,
    vehicle_info VARCHAR(255), -- "White Van, Plate: ABC123"

    -- Building Contact
    building_contact_notified BOOLEAN DEFAULT false,
    building_contact_name VARCHAR(255),
    building_notification_sent_at TIMESTAMP WITH TIME ZONE,

    -- Message/Instructions
    authorization_message TEXT,
    special_instructions TEXT,

    -- Completion
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    actual_departure_time TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    completion_notes TEXT,

    -- Metadata
    requested_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_access_time CHECK (access_time_end > access_time_start OR access_time_end IS NULL),
    CONSTRAINT positive_personnel CHECK (number_of_personnel > 0)
);

-- Indexes for access_authorizations
CREATE INDEX idx_access_auth_vendor_id ON public.access_authorizations(vendor_id);
CREATE INDEX idx_access_auth_property_id ON public.access_authorizations(property_id);
CREATE INDEX idx_access_auth_unit_id ON public.access_authorizations(unit_id);
CREATE INDEX idx_access_auth_job_id ON public.access_authorizations(job_id);
CREATE INDEX idx_access_auth_coi_id ON public.access_authorizations(coi_id);
CREATE INDEX idx_access_auth_status ON public.access_authorizations(status);
CREATE INDEX idx_access_auth_access_date ON public.access_authorizations(access_date);
CREATE INDEX idx_access_auth_created_at ON public.access_authorizations(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER trigger_access_auth_updated_at
    BEFORE UPDATE ON public.access_authorizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COI STATUS UPDATE FUNCTION
-- Automatically update COI status based on expiration dates
-- =====================================================
CREATE OR REPLACE FUNCTION update_coi_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Mark as expired if past valid_through date
    UPDATE public.vendor_cois
    SET status = 'expired'
    WHERE status != 'expired'
    AND valid_through < CURRENT_DATE;

    -- Mark as expiring_soon if within 30 days
    UPDATE public.vendor_cois
    SET status = 'expiring_soon'
    WHERE status = 'active'
    AND valid_through BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days');

    -- Mark access authorizations as expired if COI expired
    UPDATE public.access_authorizations
    SET status = 'expired'
    WHERE status IN ('requested', 'approved')
    AND coi_id IN (
        SELECT coi_id
        FROM public.vendor_cois
        WHERE status = 'expired'
    );
END;
$$;

-- =====================================================
-- 5. GET VENDOR COI STATUS FUNCTION
-- Check if vendor has valid COI for specific coverage types
-- =====================================================
CREATE OR REPLACE FUNCTION check_vendor_coi_valid(
    p_vendor_id UUID,
    p_coverage_types TEXT[] DEFAULT ARRAY['general_liability']
)
RETURNS TABLE (
    is_valid BOOLEAN,
    missing_coverages TEXT[],
    expiring_soon TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_coverage TEXT;
    v_has_valid BOOLEAN;
    v_expiring BOOLEAN;
    v_missing TEXT[] := ARRAY[]::TEXT[];
    v_expiring_list TEXT[] := ARRAY[]::TEXT[];
    v_all_valid BOOLEAN := true;
BEGIN
    -- Check each required coverage type
    FOREACH v_coverage IN ARRAY p_coverage_types
    LOOP
        -- Check if vendor has valid COI for this coverage
        SELECT EXISTS (
            SELECT 1
            FROM public.vendor_cois
            WHERE vendor_id = p_vendor_id
            AND coverage_type = v_coverage
            AND status IN ('active', 'expiring_soon')
            AND valid_through >= CURRENT_DATE
        ) INTO v_has_valid;

        IF NOT v_has_valid THEN
            v_missing := array_append(v_missing, v_coverage);
            v_all_valid := false;
        ELSE
            -- Check if expiring soon
            SELECT EXISTS (
                SELECT 1
                FROM public.vendor_cois
                WHERE vendor_id = p_vendor_id
                AND coverage_type = v_coverage
                AND status = 'expiring_soon'
            ) INTO v_expiring;

            IF v_expiring THEN
                v_expiring_list := array_append(v_expiring_list, v_coverage);
            END IF;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_all_valid, v_missing, v_expiring_list;
END;
$$;

-- =====================================================
-- 6. GET EXPIRING COIs FUNCTION
-- Get all COIs expiring within specified days
-- =====================================================
CREATE OR REPLACE FUNCTION get_expiring_cois(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    coi_id UUID,
    vendor_id UUID,
    vendor_name VARCHAR,
    coverage_type VARCHAR,
    valid_through DATE,
    days_until_expiry INTEGER,
    alert_sent BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vc.coi_id,
        vc.vendor_id,
        p.name AS vendor_name,
        vc.coverage_type,
        vc.valid_through,
        (vc.valid_through - CURRENT_DATE)::INTEGER AS days_until_expiry,
        CASE
            WHEN (vc.valid_through - CURRENT_DATE) <= 7 THEN vc.alert_7_days_sent
            WHEN (vc.valid_through - CURRENT_DATE) <= 15 THEN vc.alert_15_days_sent
            WHEN (vc.valid_through - CURRENT_DATE) <= 30 THEN vc.alert_30_days_sent
            ELSE false
        END AS alert_sent
    FROM public.vendor_cois vc
    JOIN public.providers p ON vc.vendor_id = p.provider_id
    WHERE vc.status IN ('active', 'expiring_soon')
    AND vc.valid_through BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
    ORDER BY vc.valid_through ASC;
END;
$$;

-- =====================================================
-- 7. RLS POLICIES FOR VENDOR COIs
-- =====================================================

-- Enable RLS
ALTER TABLE public.vendor_cois ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin, Ops, and Property Managers can view
CREATE POLICY "Users can view vendor COIs"
    ON public.vendor_cois FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- INSERT: Admin and Ops can create
CREATE POLICY "Admins and Ops can create vendor COIs"
    ON public.vendor_cois FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops')
        )
    );

-- UPDATE: Admin and Ops can update
CREATE POLICY "Admins and Ops can update vendor COIs"
    ON public.vendor_cois FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops')
        )
    );

-- DELETE: Admin only
CREATE POLICY "Admins can delete vendor COIs"
    ON public.vendor_cois FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type = 'admin'
        )
    );

-- =====================================================
-- 8. RLS POLICIES FOR BUILDING COIs
-- =====================================================

-- Enable RLS
ALTER TABLE public.building_cois ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin, Ops, and Property Managers can view
CREATE POLICY "Users can view building COIs"
    ON public.building_cois FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- INSERT: Admin and Ops can create
CREATE POLICY "Admins and Ops can create building COIs"
    ON public.building_cois FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops')
        )
    );

-- UPDATE: Admin and Ops can update
CREATE POLICY "Admins and Ops can update building COIs"
    ON public.building_cois FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops')
        )
    );

-- DELETE: Admin only
CREATE POLICY "Admins can delete building COIs"
    ON public.building_cois FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type = 'admin'
        )
    );

-- =====================================================
-- 9. RLS POLICIES FOR ACCESS AUTHORIZATIONS
-- =====================================================

-- Enable RLS
ALTER TABLE public.access_authorizations ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin, Ops, and Property Managers can view
CREATE POLICY "Users can view access authorizations"
    ON public.access_authorizations FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- INSERT: Admin and Ops can create
CREATE POLICY "Admins and Ops can create access authorizations"
    ON public.access_authorizations FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops')
        )
    );

-- UPDATE: Admin and Ops can update
CREATE POLICY "Admins and Ops can update access authorizations"
    ON public.access_authorizations FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops')
        )
    );

-- DELETE: Admin only
CREATE POLICY "Admins can delete access authorizations"
    ON public.access_authorizations FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type = 'admin'
        )
    );

-- =====================================================
-- 10. SCHEDULED JOB TO UPDATE COI STATUS
-- Run daily at midnight to update statuses
-- Note: This requires pg_cron extension
-- =====================================================

-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('update-coi-status', '0 0 * * *', 'SELECT update_coi_status();');

-- =====================================================
-- MIGRATION COMPLETE
-- COI Management System ready for use
-- =====================================================

-- Create initial view for dashboard stats
CREATE OR REPLACE VIEW coi_dashboard_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'active') AS active_cois,
    COUNT(*) FILTER (WHERE status = 'expiring_soon') AS expiring_soon,
    COUNT(*) FILTER (WHERE status = 'expired') AS expired_cois,
    COUNT(DISTINCT vendor_id) AS vendors_with_cois,
    COUNT(*) FILTER (WHERE valid_through < CURRENT_DATE) AS past_due
FROM public.vendor_cois;

COMMENT ON TABLE public.vendor_cois IS 'Certificate of Insurance tracking for vendors';
COMMENT ON TABLE public.building_cois IS 'Insurance requirements and policies for each building/property';
COMMENT ON TABLE public.access_authorizations IS 'Vendor access requests, approvals, and tracking';
COMMENT ON FUNCTION update_coi_status() IS 'Updates COI status based on expiration dates';
COMMENT ON FUNCTION check_vendor_coi_valid(UUID, TEXT[]) IS 'Validates vendor has required insurance coverage';
COMMENT ON FUNCTION get_expiring_cois(INTEGER) IS 'Returns COIs expiring within specified days';
