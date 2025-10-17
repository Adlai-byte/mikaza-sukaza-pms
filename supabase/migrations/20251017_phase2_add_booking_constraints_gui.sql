-- =====================================================
-- PHASE 2: Add Booking Field Constraints & Validation
-- =====================================================
-- Version: For GUI Tools (Supabase Dashboard, pgAdmin, etc.)
-- Author: Booking Management Module Enhancement
-- Date: 2025-10-17
-- Description: Adds CHECK constraints and validation rules after code is updated
-- Impact: MODERATE - May fail if existing data violates constraints
-- Prerequisites:
--   1. Phase 1 migration completed
--   2. Application code updated to use new fields
--   3. Data cleaned (no invalid values)
-- =====================================================

-- =====================================================
-- STEP 1: Update Booking Status Enum
-- =====================================================

ALTER TABLE property_bookings
  DROP CONSTRAINT IF EXISTS property_bookings_booking_status_check;

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

-- =====================================================
-- STEP 4: Add Financial Validation
-- =====================================================

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

ALTER TABLE property_bookings
  ADD CONSTRAINT channel_commission_range
  CHECK (channel_commission IS NULL OR (channel_commission >= 0 AND channel_commission <= 100));

-- =====================================================
-- STEP 5: Add Guest Count Validation
-- =====================================================

ALTER TABLE property_bookings
  ADD CONSTRAINT guest_counts_non_negative
  CHECK (
    (guest_count_adults IS NULL OR guest_count_adults >= 0) AND
    (guest_count_children IS NULL OR guest_count_children >= 0) AND
    (guest_count_infants IS NULL OR guest_count_infants >= 0)
  );

ALTER TABLE property_bookings
  ADD CONSTRAINT guest_count_consistency
  CHECK (
    (guest_count_adults IS NULL OR guest_count_children IS NULL OR guest_count_infants IS NULL) OR
    (number_of_guests IS NULL) OR
    (number_of_guests = COALESCE(guest_count_adults, 0) + COALESCE(guest_count_children, 0) + COALESCE(guest_count_infants, 0))
  );

-- =====================================================
-- STEP 6: Add Date Validation
-- =====================================================

ALTER TABLE property_bookings
  DROP CONSTRAINT IF EXISTS check_out_after_check_in;

ALTER TABLE property_bookings
  ADD CONSTRAINT check_out_after_check_in
  CHECK (check_out_date > check_in_date);

ALTER TABLE property_bookings
  ADD CONSTRAINT checked_in_timestamp_valid
  CHECK (
    checked_in_at IS NULL OR
    DATE(checked_in_at) >= check_in_date
  );

ALTER TABLE property_bookings
  ADD CONSTRAINT checked_out_timestamp_valid
  CHECK (
    checked_out_at IS NULL OR
    DATE(checked_out_at) <= check_out_date
  );

ALTER TABLE property_bookings
  ADD CONSTRAINT checked_out_after_checked_in
  CHECK (
    checked_in_at IS NULL OR
    checked_out_at IS NULL OR
    checked_out_at > checked_in_at
  );

-- =====================================================
-- STEP 7: Add Cancellation Logic Constraints
-- =====================================================

ALTER TABLE property_bookings
  ADD CONSTRAINT cancellation_status_consistency
  CHECK (
    (cancelled_at IS NULL) OR
    (booking_status = 'cancelled')
  );

-- =====================================================
-- STEP 8: Add Unique Constraints
-- =====================================================

DROP INDEX IF EXISTS idx_bookings_confirmation_code_unique;
CREATE UNIQUE INDEX idx_bookings_confirmation_code_unique
  ON property_bookings(confirmation_code)
  WHERE confirmation_code IS NOT NULL;

DROP INDEX IF EXISTS idx_bookings_external_id_channel_unique;
CREATE UNIQUE INDEX idx_bookings_external_id_channel_unique
  ON property_bookings(external_booking_id, booking_channel)
  WHERE external_booking_id IS NOT NULL AND booking_channel IS NOT NULL;

-- =====================================================
-- STEP 9: Add Business Logic Constraints
-- =====================================================

ALTER TABLE property_bookings
  ADD CONSTRAINT blocked_bookings_no_guest_details
  CHECK (
    booking_status != 'blocked' OR
    (guest_email IS NULL AND guest_phone IS NULL)
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'property_bookings'
    AND constraint_type = 'CHECK';

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
  RAISE NOTICE '  • Commission: 0-100%%';
  RAISE NOTICE '  • Guest counts: Non-negative';
  RAISE NOTICE '  • Dates: Check-out > Check-in';
  RAISE NOTICE '  • Timestamps: Logical order';
  RAISE NOTICE '  • Confirmation codes: Unique';
  RAISE NOTICE '  • External IDs: Unique per channel';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test booking creation with all statuses';
  RAISE NOTICE '2. Test booking updates';
  RAISE NOTICE '3. Monitor application logs for constraint violations';
  RAISE NOTICE '========================================';
END $$;
