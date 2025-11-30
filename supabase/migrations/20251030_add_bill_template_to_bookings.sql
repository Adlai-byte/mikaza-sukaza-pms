-- Add Bill Template Reference to Property Bookings
-- This enables template-based pricing for bookings and consistent invoice generation
-- Date: 2025-10-30

-- =============================================
-- 1. ADD COLUMN TO property_bookings
-- =============================================

-- Add optional reference to the bill template used for this booking
ALTER TABLE property_bookings
ADD COLUMN IF NOT EXISTS bill_template_id UUID REFERENCES bill_templates(template_id) ON DELETE SET NULL;

-- Add index for performance when querying bookings by template
CREATE INDEX IF NOT EXISTS idx_property_bookings_template ON property_bookings(bill_template_id);

-- Add comment
COMMENT ON COLUMN property_bookings.bill_template_id IS 'Optional: Bill template used to generate pricing for this booking. Used to maintain consistency when creating invoices.';

-- =============================================
-- 2. UPDATE VIEW (if exists)
-- =============================================

-- If there's a booking overview view, we might need to update it
-- This is a safe no-op if the view doesn't exist
DROP VIEW IF EXISTS booking_invoice_overview CASCADE;

-- Recreate the booking_invoice_overview view with the new column
CREATE OR REPLACE VIEW booking_invoice_overview AS
SELECT
  b.booking_id,
  b.property_id,
  b.guest_name,
  b.guest_email,
  b.check_in_date,
  b.check_out_date,
  b.total_amount as booking_amount,
  b.payment_status as booking_payment_status,
  b.booking_status,
  b.bill_template_id,
  b.invoice_id,
  i.invoice_number,
  i.total_amount as invoice_amount,
  i.status as invoice_status,
  i.amount_paid as invoice_paid_amount,
  p.property_name,
  bt.template_name as bill_template_name,
  b.created_at as booking_created_at,
  i.created_at as invoice_created_at
FROM property_bookings b
LEFT JOIN invoices i ON b.invoice_id = i.invoice_id
LEFT JOIN properties p ON b.property_id = p.property_id
LEFT JOIN bill_templates bt ON b.bill_template_id = bt.template_id;

COMMENT ON VIEW booking_invoice_overview IS 'Consolidated view of bookings with their linked invoices and template information';

-- =============================================
-- Migration Complete
-- =============================================

-- Note: Existing bookings will have NULL bill_template_id (which is correct)
-- Future bookings can optionally reference a template for consistent pricing
