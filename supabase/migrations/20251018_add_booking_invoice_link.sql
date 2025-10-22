-- =====================================================
-- BOOKING-INVOICE BIDIRECTIONAL LINK
-- Enables seamless integration between bookings and billing
-- =====================================================

-- Add invoice_id to property_bookings table (bidirectional link)
ALTER TABLE public.property_bookings
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(invoice_id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_property_bookings_invoice_id
ON public.property_bookings(invoice_id);

-- Add invoice_status to bookings for quick reference (denormalized for performance)
ALTER TABLE public.property_bookings
ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20)
CHECK (invoice_status IN ('not_generated', 'draft', 'sent', 'paid', 'overdue', 'cancelled'));

-- Set default invoice_status for existing bookings
UPDATE public.property_bookings
SET invoice_status = 'not_generated'
WHERE invoice_status IS NULL;

-- Create trigger to auto-sync invoice_status when invoice changes
CREATE OR REPLACE FUNCTION sync_booking_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice status changes, update the linked booking
    IF TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status) THEN
        UPDATE public.property_bookings
        SET invoice_status = NEW.status
        WHERE invoice_id = NEW.invoice_id;
    END IF;

    -- When invoice is deleted, reset booking invoice fields
    IF TG_OP = 'DELETE' THEN
        UPDATE public.property_bookings
        SET
            invoice_id = NULL,
            invoice_status = 'not_generated'
        WHERE invoice_id = OLD.invoice_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_booking_invoice_status
    AFTER UPDATE OR DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_booking_invoice_status();

-- Create trigger to sync booking invoice_id when invoice is created
CREATE OR REPLACE FUNCTION sync_invoice_to_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice is created with a booking_id, update the booking
    IF TG_OP = 'INSERT' AND NEW.booking_id IS NOT NULL THEN
        UPDATE public.property_bookings
        SET
            invoice_id = NEW.invoice_id,
            invoice_status = NEW.status
        WHERE booking_id = NEW.booking_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_invoice_to_booking
    AFTER INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_to_booking();

-- Create view for booking-invoice overview
CREATE OR REPLACE VIEW booking_invoice_overview AS
SELECT
    b.booking_id,
    b.property_id,
    p.property_name,
    b.guest_name,
    b.guest_email,
    b.check_in_date,
    b.check_out_date,
    b.booking_status,
    b.payment_status as booking_payment_status,
    b.total_amount as booking_total,
    b.deposit_amount as booking_deposit,
    b.invoice_id,
    b.invoice_status,
    i.invoice_number,
    i.status as invoice_payment_status,
    i.total_amount as invoice_total,
    i.amount_paid as invoice_paid,
    i.balance_due as invoice_balance,
    i.issue_date,
    i.due_date,
    i.paid_date,
    CASE
        WHEN b.invoice_id IS NULL THEN 'no_invoice'
        WHEN i.status = 'paid' THEN 'paid'
        WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN 'overdue'
        WHEN i.status = 'sent' THEN 'awaiting_payment'
        WHEN i.status = 'draft' THEN 'invoice_draft'
        ELSE 'unknown'
    END as payment_workflow_status
FROM public.property_bookings b
LEFT JOIN public.properties p ON b.property_id = p.property_id
LEFT JOIN public.invoices i ON b.invoice_id = i.invoice_id;

-- Grant permissions
GRANT SELECT ON booking_invoice_overview TO authenticated;

-- Comments
COMMENT ON COLUMN public.property_bookings.invoice_id IS 'Linked invoice for this booking (bidirectional reference)';
COMMENT ON COLUMN public.property_bookings.invoice_status IS 'Denormalized invoice status for quick reference';
COMMENT ON VIEW booking_invoice_overview IS 'Combined view of bookings and their invoices for easy querying';
