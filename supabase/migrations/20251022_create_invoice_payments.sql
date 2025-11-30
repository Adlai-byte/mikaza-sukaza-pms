-- =============================================
-- INVOICE PAYMENTS TABLE
-- Track payment history for invoices
-- =============================================

CREATE TABLE IF NOT EXISTS public.invoice_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,

    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON public.invoice_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_created_by ON public.invoice_payments(created_by);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_invoice_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoice_payments_updated_at ON public.invoice_payments;
CREATE TRIGGER trigger_invoice_payments_updated_at
    BEFORE UPDATE ON public.invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payments_updated_at();

-- Function to update invoice payment status based on payments
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total DECIMAL(12, 2);
    total_paid DECIMAL(12, 2);
    v_invoice_id UUID;
BEGIN
    -- Get invoice_id from the trigger operation
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Get invoice total
    SELECT total_amount INTO invoice_total
    FROM public.invoices
    WHERE invoice_id = v_invoice_id;

    -- Calculate total payments
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.invoice_payments
    WHERE invoice_id = v_invoice_id;

    -- Update invoice
    UPDATE public.invoices
    SET
        amount_paid = total_paid,
        status = CASE
            WHEN total_paid = 0 THEN
                CASE WHEN status = 'paid' THEN 'sent' ELSE status END
            WHEN total_paid >= invoice_total THEN 'paid'
            WHEN total_paid > 0 THEN 'sent'
            ELSE status
        END,
        paid_date = CASE
            WHEN total_paid >= invoice_total THEN COALESCE(
                (SELECT MAX(payment_date) FROM public.invoice_payments WHERE invoice_id = v_invoice_id),
                CURRENT_TIMESTAMP
            )
            ELSE NULL
        END
    WHERE invoice_id = v_invoice_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update invoice status when payment is added/updated/deleted
DROP TRIGGER IF EXISTS trigger_update_invoice_on_payment ON public.invoice_payments;
CREATE TRIGGER trigger_update_invoice_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- RLS Policies
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Admin and OPS can view all payments
CREATE POLICY "Admin and OPS can view all invoice payments"
    ON public.invoice_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid()
            AND user_type IN ('admin', 'ops')
        )
    );

-- Admin and OPS can insert payments
CREATE POLICY "Admin and OPS can create invoice payments"
    ON public.invoice_payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid()
            AND user_type IN ('admin', 'ops')
        )
    );

-- Admin and OPS can update payments
CREATE POLICY "Admin and OPS can update invoice payments"
    ON public.invoice_payments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid()
            AND user_type IN ('admin', 'ops')
        )
    );

-- Only admin can delete payments
CREATE POLICY "Only admin can delete invoice payments"
    ON public.invoice_payments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid()
            AND user_type = 'admin'
        )
    );

-- Comments
COMMENT ON TABLE public.invoice_payments IS 'Payment history for invoices - supports partial and multiple payments';
COMMENT ON COLUMN public.invoice_payments.amount IS 'Payment amount received';
COMMENT ON COLUMN public.invoice_payments.reference_number IS 'Check number, transaction ID, or other payment reference';

-- Verification query
SELECT
    'invoice_payments' as table_name,
    COUNT(*) as payment_count
FROM public.invoice_payments;
