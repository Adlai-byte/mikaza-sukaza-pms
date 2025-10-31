-- Migration: Sync Invoice Payment Status to Booking
-- Date: 2025-11-01
-- Purpose: Ensure booking.payment_status always reflects the linked invoice payment state
-- This fixes the critical data inconsistency issue where invoices show 'paid' but bookings show 'pending'

-- ==============================================================================
-- FUNCTION: sync_invoice_payment_to_booking
-- ==============================================================================
-- This function updates the booking's payment_status based on the invoice's payment state
-- Triggered whenever an invoice's amount_paid or status changes

CREATE OR REPLACE FUNCTION sync_invoice_payment_to_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Get the linked booking_id from the invoice
  v_booking_id := NEW.booking_id;

  -- Only proceed if invoice is linked to a booking
  IF v_booking_id IS NOT NULL THEN

    -- Update the booking's payment_status based on invoice payment state
    UPDATE property_bookings
    SET
      payment_status = CASE
        -- If invoice is fully paid
        WHEN NEW.status = 'paid' OR NEW.amount_paid >= NEW.total_amount THEN 'paid'

        -- If invoice has partial payment
        WHEN NEW.amount_paid > 0 AND NEW.amount_paid < NEW.total_amount THEN 'partially_paid'

        -- If invoice is refunded
        WHEN NEW.status = 'refunded' THEN 'refunded'

        -- If invoice is cancelled
        WHEN NEW.status = 'cancelled' THEN 'cancelled'

        -- Otherwise keep as pending (draft, sent, overdue)
        ELSE 'pending'
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = v_booking_id;

    -- Log the sync for debugging (optional)
    RAISE NOTICE 'Synced payment status for booking % from invoice %: amount_paid=%, total=%, status=%',
      v_booking_id, NEW.invoice_id, NEW.amount_paid, NEW.total_amount, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- TRIGGER: trigger_sync_invoice_payment_to_booking
-- ==============================================================================
-- Fires after invoice updates that affect payment status

DROP TRIGGER IF EXISTS trigger_sync_invoice_payment_to_booking ON public.invoices;

CREATE TRIGGER trigger_sync_invoice_payment_to_booking
  AFTER UPDATE OF amount_paid, status ON public.invoices
  FOR EACH ROW
  WHEN (
    -- Only trigger when payment-related fields actually change
    NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
    OR NEW.status IS DISTINCT FROM OLD.status
  )
  EXECUTE FUNCTION sync_invoice_payment_to_booking();

-- ==============================================================================
-- INITIAL SYNC: Update existing bookings with correct payment status
-- ==============================================================================
-- This ensures any bookings with existing invoices get their status synced immediately

DO $$
DECLARE
  v_sync_count INTEGER := 0;
BEGIN
  -- Update all bookings that have linked invoices
  UPDATE property_bookings b
  SET
    payment_status = CASE
      WHEN i.status = 'paid' OR i.amount_paid >= i.total_amount THEN 'paid'
      WHEN i.amount_paid > 0 AND i.amount_paid < i.total_amount THEN 'partially_paid'
      WHEN i.status = 'refunded' THEN 'refunded'
      WHEN i.status = 'cancelled' THEN 'cancelled'
      ELSE 'pending'
    END,
    updated_at = CURRENT_TIMESTAMP
  FROM invoices i
  WHERE b.invoice_id = i.invoice_id
    AND b.invoice_id IS NOT NULL
    -- Only update if the status doesn't already match
    AND b.payment_status IS DISTINCT FROM (
      CASE
        WHEN i.status = 'paid' OR i.amount_paid >= i.total_amount THEN 'paid'
        WHEN i.amount_paid > 0 AND i.amount_paid < i.total_amount THEN 'partially_paid'
        WHEN i.status = 'refunded' THEN 'refunded'
        WHEN i.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
      END
    );

  GET DIAGNOSTICS v_sync_count = ROW_COUNT;

  RAISE NOTICE 'Initial sync completed: Updated % bookings with payment status from linked invoices', v_sync_count;
END $$;

-- ==============================================================================
-- COMMENTS
-- ==============================================================================

COMMENT ON FUNCTION sync_invoice_payment_to_booking() IS
  'Automatically syncs booking payment_status when the linked invoice payment state changes. Ensures data consistency between bookings and invoices.';

COMMENT ON TRIGGER trigger_sync_invoice_payment_to_booking ON public.invoices IS
  'Maintains booking payment status in sync with invoice payment state. Critical for preventing data inconsistencies.';

-- ==============================================================================
-- VERIFICATION QUERY (Run manually to check sync is working)
-- ==============================================================================
-- SELECT
--   b.booking_id,
--   b.guest_name,
--   b.payment_status AS booking_payment_status,
--   i.invoice_number,
--   i.status AS invoice_status,
--   i.amount_paid,
--   i.total_amount,
--   CASE
--     WHEN i.status = 'paid' OR i.amount_paid >= i.total_amount THEN 'MATCH: Both show paid'
--     WHEN b.payment_status = 'partially_paid' AND i.amount_paid > 0 AND i.amount_paid < i.total_amount THEN 'MATCH: Both show partial'
--     WHEN b.payment_status = 'pending' AND i.amount_paid = 0 THEN 'MATCH: Both show pending'
--     ELSE 'MISMATCH: Status does not match!'
--   END AS sync_status
-- FROM property_bookings b
-- INNER JOIN invoices i ON b.invoice_id = i.invoice_id
-- WHERE b.invoice_id IS NOT NULL
-- ORDER BY b.created_at DESC
-- LIMIT 20;
