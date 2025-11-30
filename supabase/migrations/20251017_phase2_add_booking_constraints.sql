-- =====================================================
-- PHASE 2: Add Booking Field Constraints & Validation
-- =====================================================
-- Author: Booking Management Module Enhancement
-- Date: 2025-10-17
-- Description: Adds CHECK constraints and validation rules after code is updated
-- Impact: MODERATE - May fail if existing data violates constraints
-- Prerequisites:
--   1. Phase 1 migration completed
--   2. Application code updated to use new fields
--   3. Data cleaned (no invalid values)
-- Rollback: See rollback_phase2.sql
-- =====================================================

\set ON_ERROR_STOP on

BEGIN;

-- =====================================================
-- STEP 1: Update Booking Status Enum
-- =====================================================

-- Drop old constraint if exists
ALTER TABLE property_bookings
  DROP CONSTRAINT IF EXISTS property_bookings_booking_status_check;

-- Add expanded status constraint
ALTER TABLE property_bookings
  ADD CONSTRAINT property_bookings_booking_status_check
  CHECK (booking_status IS NULL OR booking_status IN (
    'inquiry',      -- Initial inquiry, not confirmed
    'pending',      -- Awaiting confirmation
    'confirmed',    -- Confirmed booking
    'checked_in',   -- Guest has checked in
    'checked_out',  -- Guest has checked out
    'completed',    -- Booking finished and finalized
    'cancelled',    -- Cancelled by guest or admin
    'blocked'       -- Dates blocked for maintenance/unavailability
  ));

RAISE NOTICE '✅ Updated booking_status constraint to include 8 statuses';

-- =====================================================
-- STEP 2: Add Booking Channel Constraint
-- =====================================================

ALTER TABLE property_bookings
  ADD CONSTRAINT booking_channel_check
  CHECK (booking_channel IS NULL OR booking_channel IN (
    'airbnb',
    'booking',
    'vrbo',
    'direct',
    'expedia',
    'homeaway',
    'tripadvisor',
    'other'
  ));

RAISE NOTICE '✅ Added booking_channel constraint (8 channels)';

-- =====================================================
-- STEP 3: Add Payment Status Constraint
-- =====================================================

ALTER TABLE property_bookings
  ADD CONSTRAINT payment_status_check
  CHECK (payment_status IS NULL OR payment_status IN (
    'pending',
    'paid',
    'partially_paid',
    'refunded',
    'cancelled'
  ));

RAISE NOTICE '✅ Added payment_status constraint (5 statuses)';

-- =====================================================
-- STEP 4: Add Financial Validation
-- =====================================================

-- All financial amounts must be non-negative
ALTER TABLE property_bookings
  ADD CONSTRAINT financial_amounts_non_negative
  CHECK (
    (base_amount IS NULL OR base_amount >= 0) AND
    (extras_amount IS NULL OR extras_amount >= 0) AND
    (tax_amount IS NULL OR tax_amount >= 0) AND
    (cleaning_fee IS NULL OR cleaning_fee >= 0) AND
    (security_deposit IS NULL OR security_deposit >= 0) AND
    (total_amount IS NULL OR total_amount >= 0) AND
    (deposit_amount IS NULL OR deposit_amount >= 0)
  );

RAISE NOTICE '✅ Added non-negative constraint for financial amounts';

-- Commission must be between 0 and 100
ALTER TABLE property_bookings
  ADD CONSTRAINT channel_commission_range
  CHECK (channel_commission IS NULL OR (channel_commission >= 0 AND channel_commission <= 100));

RAISE NOTICE '✅ Added commission range constraint (0-100%)';

-- =====================================================
-- STEP 5: Add Guest Count Validation
-- =====================================================

-- Guest counts must be non-negative
ALTER TABLE property_bookings
  ADD CONSTRAINT guest_counts_non_negative
  CHECK (
    (guest_count_adults IS NULL OR guest_count_adults >= 0) AND
    (guest_count_children IS NULL OR guest_count_children >= 0) AND
    (guest_count_infants IS NULL OR guest_count_infants >= 0)
  );

RAISE NOTICE '✅ Added non-negative constraint for guest counts';

-- Total guests should match sum (if both are provided)
ALTER TABLE property_bookings
  ADD CONSTRAINT guest_count_consistency
  CHECK (
    -- If individual counts are provided, they should sum to total
    (guest_count_adults IS NULL OR guest_count_children IS NULL OR guest_count_infants IS NULL) OR
    (number_of_guests IS NULL) OR
    (number_of_guests = COALESCE(guest_count_adults, 0) + COALESCE(guest_count_children, 0) + COALESCE(guest_count_infants, 0))
  );

RAISE NOTICE '✅ Added guest count consistency constraint';

-- =====================================================
-- STEP 6: Add Date Validation
-- =====================================================

-- Check-out date must be after check-in date
ALTER TABLE property_bookings
  DROP CONSTRAINT IF EXISTS check_out_after_check_in;

ALTER TABLE property_bookings
  ADD CONSTRAINT check_out_after_check_in
  CHECK (check_out_date > check_in_date);

RAISE NOTICE '✅ Added check-out after check-in constraint';

-- Checked-in timestamp should be on or after check-in date
ALTER TABLE property_bookings
  ADD CONSTRAINT checked_in_timestamp_valid
  CHECK (
    checked_in_at IS NULL OR
    DATE(checked_in_at) >= check_in_date
  );

-- Checked-out timestamp should be on or before check-out date
ALTER TABLE property_bookings
  ADD CONSTRAINT checked_out_timestamp_valid
  CHECK (
    checked_out_at IS NULL OR
    DATE(checked_out_at) <= check_out_date
  );

-- Checked-out should be after checked-in
ALTER TABLE property_bookings
  ADD CONSTRAINT checked_out_after_checked_in
  CHECK (
    checked_in_at IS NULL OR
    checked_out_at IS NULL OR
    checked_out_at > checked_in_at
  );

RAISE NOTICE '✅ Added check-in/out timestamp validation';

-- =====================================================
-- STEP 7: Add Cancellation Logic Constraints
-- =====================================================

-- If cancelled_at is set, booking_status should be 'cancelled'
ALTER TABLE property_bookings
  ADD CONSTRAINT cancellation_status_consistency
  CHECK (
    (cancelled_at IS NULL) OR
    (booking_status = 'cancelled')
  );

-- If booking is cancelled, cancelled_at should be set
-- Note: Not enforced as constraint (can be NULL temporarily during cancellation)
-- Handled in application logic

RAISE NOTICE '✅ Added cancellation consistency constraint';

-- =====================================================
-- STEP 8: Add Unique Constraints
-- =====================================================

-- Confirmation codes must be unique (when provided)
DROP INDEX IF EXISTS idx_bookings_confirmation_code_unique;
CREATE UNIQUE INDEX idx_bookings_confirmation_code_unique
  ON property_bookings(confirmation_code)
  WHERE confirmation_code IS NOT NULL;

RAISE NOTICE '✅ Added unique constraint for confirmation codes';

-- External booking IDs must be unique per channel (when provided)
DROP INDEX IF EXISTS idx_bookings_external_id_channel_unique;
CREATE UNIQUE INDEX idx_bookings_external_id_channel_unique
  ON property_bookings(external_booking_id, booking_channel)
  WHERE external_booking_id IS NOT NULL AND booking_channel IS NOT NULL;

RAISE NOTICE '✅ Added unique constraint for external booking IDs per channel';

-- =====================================================
-- STEP 9: Add Business Logic Constraints
-- =====================================================

-- Blocked bookings shouldn't have guest information
ALTER TABLE property_bookings
  ADD CONSTRAINT blocked_bookings_no_guest_details
  CHECK (
    booking_status != 'blocked' OR
    (guest_email IS NULL AND guest_phone IS NULL)
  );

RAISE NOTICE '✅ Added blocked booking constraint';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Count constraints on property_bookings
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'property_bookings'
    AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%booking%' OR constraint_name LIKE '%payment%' OR constraint_name LIKE '%guest%' OR constraint_name LIKE '%financial%';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PHASE 2 MIGRATION COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added % CHECK constraints', constraint_count;
  RAISE NOTICE 'Added 2 UNIQUE indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Validation rules enforced:';
  RAISE NOTICE '  • Booking status: 8 valid statuses';
  RAISE NOTICE '  • Booking channel: 8 valid channels';
  RAISE NOTICE '  • Payment status: 5 valid statuses';
  RAISE NOTICE '  • Financial amounts: Non-negative';
  RAISE NOTICE '  • Commission: 0-100%';
  RAISE NOTICE '  • Guest counts: Non-negative';
  RAISE NOTICE '  • Dates: Check-out > Check-in';
  RAISE NOTICE '  • Timestamps: Logical order';
  RAISE NOTICE '  • Confirmation codes: Unique';
  RAISE NOTICE '  • External IDs: Unique per channel';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- POST-MIGRATION TESTING
-- =====================================================

-- Test valid booking statuses
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM property_bookings
    WHERE booking_status NOT IN ('inquiry', 'pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled', 'blocked')
      AND booking_status IS NOT NULL
  ) = 0, 'Invalid booking statuses found';

  RAISE NOTICE '✅ All booking statuses are valid';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Invalid booking statuses detected - review data';
END $$;

-- Test valid channels
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM property_bookings
    WHERE booking_channel NOT IN ('airbnb', 'booking', 'vrbo', 'direct', 'expedia', 'homeaway', 'tripadvisor', 'other')
      AND booking_channel IS NOT NULL
  ) = 0, 'Invalid booking channels found';

  RAISE NOTICE '✅ All booking channels are valid';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Invalid booking channels detected - review data';
END $$;

RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Test booking creation with all statuses';
RAISE NOTICE '2. Test booking updates';
RAISE NOTICE '3. Monitor application logs for constraint violations';
RAISE NOTICE '4. Consider adding triggers for automatic field population';
RAISE NOTICE '';
