-- =====================================================
-- COMMISSION & TIP SYSTEM
-- Track staff commissions, tips, and earnings
-- =====================================================

-- =====================================================
-- 1. COMMISSIONS TABLE
-- Track all commissions and tips for staff
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commissions (
    commission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Staff/User reference
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

    -- Source of commission
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'booking',          -- Commission from booking
        'invoice',          -- Commission from invoice/payment
        'service',          -- Service job commission
        'tip',              -- Direct tip from guest
        'referral',         -- Referral commission
        'bonus',            -- Performance bonus
        'adjustment',       -- Manual adjustment
        'other'
    )),

    -- Source references
    booking_id UUID REFERENCES public.property_bookings(booking_id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(invoice_id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.jobs(job_id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(property_id) ON DELETE SET NULL,

    -- Commission details
    commission_type VARCHAR(50) NOT NULL DEFAULT 'percentage' CHECK (commission_type IN (
        'percentage',       -- Percentage of amount
        'fixed',           -- Fixed amount
        'tiered'           -- Tiered based on performance
    )),

    -- Calculation basis
    base_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,      -- Amount commission is calculated from
    commission_rate DECIMAL(5, 2) DEFAULT 0,            -- Percentage rate (if applicable)
    commission_amount DECIMAL(12, 2) NOT NULL,          -- Final commission amount

    -- Status and payment
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',          -- Commission earned but not paid
        'approved',         -- Approved for payment
        'paid',             -- Paid out
        'cancelled',        -- Cancelled/voided
        'on_hold'           -- Temporarily on hold
    )),

    payment_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),

    -- Period tracking
    earned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE,
    period_end DATE,

    -- Additional details
    description TEXT,
    notes TEXT,

    -- Tip-specific fields
    tip_from_guest VARCHAR(255),        -- Guest name who gave tip
    tip_reason VARCHAR(255),             -- Reason for tip

    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT positive_amounts CHECK (
        base_amount >= 0 AND
        commission_amount >= 0 AND
        (commission_rate IS NULL OR commission_rate >= 0)
    )
);

-- Indexes for commissions
CREATE INDEX idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX idx_commissions_source_type ON public.commissions(source_type);
CREATE INDEX idx_commissions_booking_id ON public.commissions(booking_id);
CREATE INDEX idx_commissions_invoice_id ON public.commissions(invoice_id);
CREATE INDEX idx_commissions_job_id ON public.commissions(job_id);
CREATE INDEX idx_commissions_property_id ON public.commissions(property_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_earned_date ON public.commissions(earned_date);
CREATE INDEX idx_commissions_payment_date ON public.commissions(payment_date);

-- =====================================================
-- 2. COMMISSION RULES TABLE
-- Define commission rules for different scenarios
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commission_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule identification
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,

    -- Applicability
    applies_to_role VARCHAR(50), -- 'property_manager', 'ops_staff', 'admin', etc.
    applies_to_user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    applies_to_property_id UUID REFERENCES public.properties(property_id) ON DELETE CASCADE,
    applies_to_service_type VARCHAR(100),

    -- Commission configuration
    commission_type VARCHAR(50) NOT NULL DEFAULT 'percentage' CHECK (commission_type IN (
        'percentage',
        'fixed',
        'tiered'
    )),

    commission_rate DECIMAL(5, 2),          -- Percentage (e.g., 10.00 for 10%)
    fixed_amount DECIMAL(12, 2),            -- Fixed amount

    -- Tiered rates (stored as JSONB)
    -- Example: [{"min": 0, "max": 1000, "rate": 5}, {"min": 1001, "max": 5000, "rate": 7.5}]
    tiered_rates JSONB,

    -- Conditions
    min_amount DECIMAL(12, 2),              -- Minimum amount to qualify
    max_amount DECIMAL(12, 2),              -- Maximum commission cap

    -- Validity period
    valid_from DATE,
    valid_until DATE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,             -- Higher priority rules apply first

    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_commission_config CHECK (
        (commission_type = 'percentage' AND commission_rate IS NOT NULL) OR
        (commission_type = 'fixed' AND fixed_amount IS NOT NULL) OR
        (commission_type = 'tiered' AND tiered_rates IS NOT NULL)
    )
);

-- Indexes for commission rules
CREATE INDEX idx_commission_rules_role ON public.commission_rules(applies_to_role);
CREATE INDEX idx_commission_rules_user_id ON public.commission_rules(applies_to_user_id);
CREATE INDEX idx_commission_rules_property_id ON public.commission_rules(applies_to_property_id);
CREATE INDEX idx_commission_rules_active ON public.commission_rules(is_active);
CREATE INDEX idx_commission_rules_priority ON public.commission_rules(priority DESC);

-- =====================================================
-- 3. INVOICE TIPS/GRATUITIES
-- Track tips added to invoices for specific staff
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoice_tips (
    tip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Invoice reference
    invoice_id UUID NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,

    -- Staff member receiving the tip
    recipient_user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

    -- Tip details
    tip_amount DECIMAL(12, 2) NOT NULL CHECK (tip_amount > 0),
    tip_percentage DECIMAL(5, 2),           -- If calculated as % of invoice

    -- Description
    tip_reason VARCHAR(255),                 -- e.g., "Excellent cleaning service"
    guest_notes TEXT,                        -- Notes from guest

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',          -- Tip recorded but not processed
        'processed',        -- Converted to commission
        'paid',             -- Paid out to staff
        'cancelled'         -- Cancelled
    )),

    -- Link to commission (when processed)
    commission_id UUID REFERENCES public.commissions(commission_id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for invoice tips
CREATE INDEX idx_invoice_tips_invoice_id ON public.invoice_tips(invoice_id);
CREATE INDEX idx_invoice_tips_recipient_user_id ON public.invoice_tips(recipient_user_id);
CREATE INDEX idx_invoice_tips_status ON public.invoice_tips(status);
CREATE INDEX idx_invoice_tips_commission_id ON public.invoice_tips(commission_id);

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER trigger_commissions_updated_at
    BEFORE UPDATE ON public.commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_commission_rules_updated_at
    BEFORE UPDATE ON public.commission_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_invoice_tips_updated_at
    BEFORE UPDATE ON public.invoice_tips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create commission from invoice tip
CREATE OR REPLACE FUNCTION process_invoice_tip()
RETURNS TRIGGER AS $$
DECLARE
    invoice_record RECORD;
    commission_uuid UUID;
BEGIN
    -- Only process when tip status changes to 'processed'
    IF NEW.status = 'processed' AND OLD.status != 'processed' THEN
        -- Get invoice details
        SELECT * INTO invoice_record FROM public.invoices WHERE invoice_id = NEW.invoice_id;

        -- Create commission record
        INSERT INTO public.commissions (
            user_id,
            source_type,
            booking_id,
            invoice_id,
            property_id,
            commission_type,
            base_amount,
            commission_rate,
            commission_amount,
            status,
            earned_date,
            description,
            tip_from_guest,
            tip_reason
        ) VALUES (
            NEW.recipient_user_id,
            'tip',
            invoice_record.booking_id,
            NEW.invoice_id,
            invoice_record.property_id,
            'fixed',
            NEW.tip_amount,
            NEW.tip_percentage,
            NEW.tip_amount,
            'approved',
            CURRENT_DATE,
            'Tip from invoice ' || invoice_record.invoice_number,
            invoice_record.guest_name,
            NEW.tip_reason
        ) RETURNING commission_id INTO commission_uuid;

        -- Link commission back to tip
        NEW.commission_id := commission_uuid;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_invoice_tip
    BEFORE UPDATE ON public.invoice_tips
    FOR EACH ROW
    EXECUTE FUNCTION process_invoice_tip();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_tips ENABLE ROW LEVEL SECURITY;

-- Commissions policies
CREATE POLICY "Users can view their own commissions"
    ON public.commissions FOR SELECT
    USING (
        user_id IN (SELECT user_id FROM public.users WHERE users.user_id = auth.uid()) OR
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'property_manager')
        )
    );

CREATE POLICY "Admins can manage all commissions"
    ON public.commissions FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type = 'admin'
        )
    );

-- Commission rules policies
CREATE POLICY "All users can view commission rules"
    ON public.commission_rules FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins can manage commission rules"
    ON public.commission_rules FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type = 'admin'
        )
    );

-- Invoice tips policies
CREATE POLICY "Users can view tips on their invoices"
    ON public.invoice_tips FOR SELECT
    USING (
        invoice_id IN (
            SELECT invoice_id FROM public.invoices
            WHERE property_id IN (
                SELECT property_id FROM public.properties
                WHERE auth.uid() IN (
                    SELECT user_id FROM public.users
                    WHERE user_type IN ('admin', 'property_manager', 'owner')
                )
            )
        ) OR
        recipient_user_id IN (SELECT user_id FROM public.users WHERE users.user_id = auth.uid())
    );

CREATE POLICY "Admins and managers can manage tips"
    ON public.invoice_tips FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'property_manager')
        )
    );

-- =====================================================
-- 6. HELPER VIEWS
-- =====================================================

-- View: Commission summary by user
CREATE OR REPLACE VIEW commission_summary_by_user AS
SELECT
    c.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.email,
    u.user_type as role,
    c.status,
    COUNT(*) as commission_count,
    SUM(c.commission_amount) as total_commissions,
    SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount ELSE 0 END) as total_pending,
    SUM(CASE WHEN c.status = 'approved' THEN c.commission_amount ELSE 0 END) as total_approved,
    MIN(c.earned_date) as first_commission_date,
    MAX(c.earned_date) as last_commission_date
FROM public.commissions c
JOIN public.users u ON c.user_id = u.user_id
GROUP BY c.user_id, u.first_name, u.last_name, u.email, u.user_type, c.status;

-- View: Monthly commission report
CREATE OR REPLACE VIEW monthly_commission_report AS
SELECT
    c.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    DATE_TRUNC('month', c.earned_date) as month,
    c.source_type,
    COUNT(*) as commission_count,
    SUM(c.base_amount) as total_base_amount,
    SUM(c.commission_amount) as total_commission,
    AVG(c.commission_rate) as avg_commission_rate
FROM public.commissions c
JOIN public.users u ON c.user_id = u.user_id
GROUP BY c.user_id, u.first_name, u.last_name, DATE_TRUNC('month', c.earned_date), c.source_type;

-- View: Tips summary
CREATE OR REPLACE VIEW tips_summary AS
SELECT
    t.recipient_user_id,
    u.first_name || ' ' || u.last_name as staff_name,
    COUNT(*) as tip_count,
    SUM(t.tip_amount) as total_tips,
    AVG(t.tip_amount) as avg_tip_amount,
    SUM(CASE WHEN t.status = 'paid' THEN t.tip_amount ELSE 0 END) as tips_paid,
    SUM(CASE WHEN t.status = 'pending' THEN t.tip_amount ELSE 0 END) as tips_pending
FROM public.invoice_tips t
JOIN public.users u ON t.recipient_user_id = u.user_id
GROUP BY t.recipient_user_id, u.first_name, u.last_name;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate commission based on rules
CREATE OR REPLACE FUNCTION calculate_commission(
    p_user_id UUID,
    p_amount DECIMAL,
    p_source_type VARCHAR DEFAULT 'booking',
    p_property_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    rule RECORD;
    calculated_amount DECIMAL := 0;
    tier JSONB;
BEGIN
    -- Find applicable rule (highest priority first)
    SELECT * INTO rule
    FROM public.commission_rules
    WHERE is_active = TRUE
        AND (applies_to_user_id IS NULL OR applies_to_user_id = p_user_id)
        AND (applies_to_property_id IS NULL OR applies_to_property_id = p_property_id)
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
        AND (min_amount IS NULL OR min_amount <= p_amount)
    ORDER BY priority DESC, created_at DESC
    LIMIT 1;

    -- No rule found
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Calculate based on commission type
    IF rule.commission_type = 'percentage' THEN
        calculated_amount := p_amount * (rule.commission_rate / 100);
    ELSIF rule.commission_type = 'fixed' THEN
        calculated_amount := rule.fixed_amount;
    ELSIF rule.commission_type = 'tiered' THEN
        -- Calculate tiered commission
        FOR tier IN SELECT * FROM jsonb_array_elements(rule.tiered_rates)
        LOOP
            IF p_amount >= (tier->>'min')::DECIMAL AND
               (tier->>'max' IS NULL OR p_amount <= (tier->>'max')::DECIMAL) THEN
                calculated_amount := p_amount * ((tier->>'rate')::DECIMAL / 100);
                EXIT;
            END IF;
        END LOOP;
    END IF;

    -- Apply max cap if set
    IF rule.max_amount IS NOT NULL AND calculated_amount > rule.max_amount THEN
        calculated_amount := rule.max_amount;
    END IF;

    RETURN calculated_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_tips TO authenticated;

-- Grant access to views
GRANT SELECT ON commission_summary_by_user TO authenticated;
GRANT SELECT ON monthly_commission_report TO authenticated;
GRANT SELECT ON tips_summary TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.commissions IS 'Track all staff commissions, tips, and earnings';
COMMENT ON TABLE public.commission_rules IS 'Define commission calculation rules for different scenarios';
COMMENT ON TABLE public.invoice_tips IS 'Track tips added to invoices for specific staff members';

COMMENT ON FUNCTION calculate_commission IS 'Calculate commission amount based on defined rules';

-- =====================================================
-- MIGRATION COMPLETE
-- Tables: commissions, commission_rules, invoice_tips
-- Features: Commission tracking, tip management, auto-calculation
-- =====================================================
