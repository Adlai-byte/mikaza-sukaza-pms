-- =====================================================
-- ACCOUNTING & BILLING SYSTEM - PHASE 1
-- Essential tables with complete audit trail
-- =====================================================

-- =====================================================
-- 1. INVOICES TABLE
-- Auto-generated invoices from bookings
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,

    -- Booking reference
    booking_id UUID REFERENCES public.property_bookings(booking_id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(property_id) ON DELETE CASCADE,

    -- Guest information
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_address TEXT,

    -- Invoice dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),

    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

    -- Additional details
    notes TEXT,
    terms TEXT,
    payment_method VARCHAR(50),

    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexing
    CONSTRAINT positive_amounts CHECK (
        subtotal >= 0 AND
        tax_amount >= 0 AND
        total_amount >= 0 AND
        amount_paid >= 0
    )
);

-- Indexes for invoices
CREATE INDEX idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_guest_email ON public.invoices(guest_email);

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    invoice_num VARCHAR(50);
BEGIN
    next_number := nextval('invoice_number_seq');
    invoice_num := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_number::TEXT, 6, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_invoice_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. INVOICE LINE ITEMS TABLE
-- Itemized charges per invoice
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    line_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,

    -- Line item details
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Tax
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Calculated amounts
    subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price + tax_amount) STORED,

    -- Item type for categorization
    item_type VARCHAR(50), -- 'accommodation', 'cleaning', 'extras', 'tax', 'commission', 'other'

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT positive_values CHECK (
        quantity > 0 AND
        unit_price >= 0 AND
        tax_rate >= 0 AND
        tax_amount >= 0
    ),
    CONSTRAINT unique_line_number_per_invoice UNIQUE (invoice_id, line_number)
);

-- Indexes for invoice line items
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_type ON public.invoice_line_items(item_type);

-- Trigger to update updated_at
CREATE TRIGGER trigger_invoice_line_items_updated_at
    BEFORE UPDATE ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to recalculate invoice totals when line items change
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.invoices
    SET
        subtotal = COALESCE((
            SELECT SUM(subtotal)
            FROM public.invoice_line_items
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0),
        tax_amount = COALESCE((
            SELECT SUM(tax_amount)
            FROM public.invoice_line_items
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0),
        total_amount = COALESCE((
            SELECT SUM(total_amount)
            FROM public.invoice_line_items
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0)
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_invoice_totals_insert
    AFTER INSERT ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_invoice_totals_update
    AFTER UPDATE ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_invoice_totals_delete
    AFTER DELETE ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_totals();

-- =====================================================
-- 3. EXPENSES TABLE
-- Property expense tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Property reference
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,

    -- Expense details
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_name VARCHAR(255),
    vendor_id UUID REFERENCES public.service_providers(provider_id) ON DELETE SET NULL,

    -- Category and description
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'maintenance',
        'utilities',
        'cleaning',
        'supplies',
        'marketing',
        'channel_commission',
        'insurance',
        'property_tax',
        'hoa_fees',
        'professional_services',
        'repairs',
        'landscaping',
        'pest_control',
        'other'
    )),
    subcategory VARCHAR(100),
    description TEXT NOT NULL,

    -- Amount
    amount DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (amount + tax_amount) STORED,

    -- Payment details
    payment_method VARCHAR(50), -- 'cash', 'credit_card', 'bank_transfer', 'check', 'other'
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded')),
    paid_date DATE,

    -- References
    reference_number VARCHAR(100), -- Invoice/receipt number from vendor
    receipt_url TEXT,

    -- Recurring expense tracking
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'yearly'

    -- Notes
    notes TEXT,

    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT positive_expense_amounts CHECK (
        amount >= 0 AND
        tax_amount >= 0
    )
);

-- Indexes for expenses
CREATE INDEX idx_expenses_property_id ON public.expenses(property_id);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_vendor_id ON public.expenses(vendor_id);
CREATE INDEX idx_expenses_payment_status ON public.expenses(payment_status);
CREATE INDEX idx_expenses_is_recurring ON public.expenses(is_recurring);

-- Trigger to update updated_at
CREATE TRIGGER trigger_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. FINANCIAL AUDIT LOG TABLE
-- Immutable audit trail for all financial changes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Change details (JSON for flexibility)
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[], -- Array of field names that changed

    -- Who and when
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,

    -- Timestamp (immutable)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Additional context
    action_context TEXT, -- e.g., "Invoice created from booking", "Manual expense entry"

    -- Indexing for fast lookups
    CONSTRAINT no_future_dates CHECK (created_at <= CURRENT_TIMESTAMP)
);

-- Indexes for audit log
CREATE INDEX idx_audit_log_table_record ON public.financial_audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user_id ON public.financial_audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.financial_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON public.financial_audit_log(action);

-- Make audit log immutable (no updates or deletes allowed)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records cannot be modified or deleted';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_update
    BEFORE UPDATE ON public.financial_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trigger_prevent_audit_delete
    BEFORE DELETE ON public.financial_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- =====================================================
-- 5. AUDIT TRAIL TRIGGERS
-- Automatically log all changes to financial tables
-- =====================================================

-- Generic audit logging function
CREATE OR REPLACE FUNCTION log_financial_change()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    old_json JSONB := NULL;
    new_json JSONB := NULL;
BEGIN
    -- Convert OLD and NEW to JSON
    IF TG_OP = 'DELETE' THEN
        old_json := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        old_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);

        -- Determine which fields changed
        SELECT ARRAY_AGG(key)
        INTO changed_fields
        FROM jsonb_each(new_json)
        WHERE new_json->key IS DISTINCT FROM old_json->key;
    ELSIF TG_OP = 'INSERT' THEN
        new_json := to_jsonb(NEW);
    END IF;

    -- Insert audit log entry
    INSERT INTO public.financial_audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        user_id,
        user_email
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(
            (new_json->>'invoice_id')::UUID,
            (new_json->>'line_item_id')::UUID,
            (new_json->>'expense_id')::UUID,
            (old_json->>'invoice_id')::UUID,
            (old_json->>'line_item_id')::UUID,
            (old_json->>'expense_id')::UUID
        ),
        TG_OP,
        old_json,
        new_json,
        changed_fields,
        auth.uid(), -- Current authenticated user
        auth.jwt()->>'email' -- User's email from JWT
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to all financial tables
CREATE TRIGGER trigger_audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION log_financial_change();

CREATE TRIGGER trigger_audit_invoice_line_items
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION log_financial_change();

CREATE TRIGGER trigger_audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION log_financial_change();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Secure access to financial data
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Users can view invoices for their properties"
    ON public.invoices FOR SELECT
    USING (
        property_id IN (
            SELECT property_id FROM public.properties
            WHERE auth.uid() IN (
                SELECT user_id FROM public.users
                WHERE user_type IN ('admin', 'property_manager', 'owner')
            )
        )
    );

CREATE POLICY "Admins and property managers can manage invoices"
    ON public.invoices FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'property_manager')
        )
    );

-- Invoice line items policies (inherit from invoice)
CREATE POLICY "Users can view invoice line items"
    ON public.invoice_line_items FOR SELECT
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
        )
    );

CREATE POLICY "Admins and property managers can manage invoice line items"
    ON public.invoice_line_items FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'property_manager')
        )
    );

-- Expenses policies
CREATE POLICY "Users can view expenses for their properties"
    ON public.expenses FOR SELECT
    USING (
        property_id IN (
            SELECT property_id FROM public.properties
            WHERE auth.uid() IN (
                SELECT user_id FROM public.users
                WHERE user_type IN ('admin', 'property_manager', 'owner')
            )
        )
    );

CREATE POLICY "Admins and property managers can manage expenses"
    ON public.expenses FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'property_manager')
        )
    );

-- Audit log policies (read-only for authorized users)
CREATE POLICY "Admins can view all audit logs"
    ON public.financial_audit_log FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type = 'admin'
        )
    );

CREATE POLICY "Property managers can view audit logs for their properties"
    ON public.financial_audit_log FOR SELECT
    USING (
        table_name IN ('invoices', 'expenses') AND
        record_id IN (
            SELECT invoice_id FROM public.invoices
            WHERE property_id IN (
                SELECT property_id FROM public.properties
                WHERE auth.uid() IN (
                    SELECT user_id FROM public.users
                    WHERE user_type = 'property_manager'
                )
            )
            UNION
            SELECT expense_id FROM public.expenses
            WHERE property_id IN (
                SELECT property_id FROM public.properties
                WHERE auth.uid() IN (
                    SELECT user_id FROM public.users
                    WHERE user_type = 'property_manager'
                )
            )
        )
    );

-- =====================================================
-- 7. HELPER VIEWS
-- Convenient views for common queries
-- =====================================================

-- View: Invoice with line items summary
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
    i.invoice_id,
    i.invoice_number,
    i.booking_id,
    i.property_id,
    p.property_name,
    i.guest_name,
    i.guest_email,
    i.issue_date,
    i.due_date,
    i.paid_date,
    i.status,
    i.subtotal,
    i.tax_amount,
    i.total_amount,
    i.amount_paid,
    i.balance_due,
    COUNT(li.line_item_id) as line_item_count,
    i.created_at,
    i.updated_at
FROM public.invoices i
LEFT JOIN public.properties p ON i.property_id = p.property_id
LEFT JOIN public.invoice_line_items li ON i.invoice_id = li.invoice_id
GROUP BY i.invoice_id, p.property_name;

-- View: Expense summary by category
CREATE OR REPLACE VIEW expense_summary_by_category AS
SELECT
    property_id,
    category,
    DATE_TRUNC('month', expense_date) as month,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount,
    SUM(tax_amount) as total_tax,
    SUM(total_amount) as grand_total
FROM public.expenses
GROUP BY property_id, category, DATE_TRUNC('month', expense_date);

-- View: Property financial overview (revenue vs expenses)
CREATE OR REPLACE VIEW property_financial_overview AS
SELECT
    p.property_id,
    p.property_name,
    DATE_TRUNC('month', COALESCE(i.issue_date, e.expense_date)) as month,
    COALESCE(SUM(i.total_amount), 0) as total_revenue,
    COALESCE(SUM(e.total_amount), 0) as total_expenses,
    COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(e.total_amount), 0) as net_income
FROM public.properties p
LEFT JOIN public.invoices i ON p.property_id = i.property_id AND i.status = 'paid'
LEFT JOIN public.expenses e ON p.property_id = e.property_id AND e.payment_status = 'paid'
GROUP BY p.property_id, p.property_name, DATE_TRUNC('month', COALESCE(i.issue_date, e.expense_date));

-- =====================================================
-- MIGRATION COMPLETE
-- Tables: invoices, invoice_line_items, expenses, financial_audit_log
-- Features: Auto-numbering, audit trail, RLS policies, helper views
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT ON public.financial_audit_log TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE invoice_number_seq TO authenticated;

COMMENT ON TABLE public.invoices IS 'Guest invoices with auto-generated invoice numbers';
COMMENT ON TABLE public.invoice_line_items IS 'Itemized charges per invoice';
COMMENT ON TABLE public.expenses IS 'Property expense tracking with categories';
COMMENT ON TABLE public.financial_audit_log IS 'Immutable audit trail for all financial changes';
