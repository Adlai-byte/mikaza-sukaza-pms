-- =====================================================
-- PHASE 1: Add New Booking Fields (Backward Compatible)
-- =====================================================
-- Author: Booking Management Module Enhancement
-- Date: 2025-10-17
-- Description: Adds missing industry-standard fields to property_bookings table
-- Impact: ZERO downtime - All columns are nullable, existing code continues to work
-- Rollback: See rollback_phase1.sql
-- =====================================================

-- Enable better error messages
\set ON_ERROR_STOP on

BEGIN;

-- =====================================================
-- STEP 1: Add Channel & Source Tracking
-- =====================================================

-- Booking channel (OTA source)
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS booking_channel TEXT;

COMMENT ON COLUMN property_bookings.booking_channel IS
  'OTA channel source: airbnb, booking, vrbo, direct, expedia, homeaway, tripadvisor, other';

-- Booking source (marketing source, referral, etc.)
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS booking_source TEXT;

COMMENT ON COLUMN property_bookings.booking_source IS
  'Marketing source or referral information';

-- Channel commission percentage
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS channel_commission DECIMAL(5,2);

COMMENT ON COLUMN property_bookings.channel_commission IS
  'Commission percentage charged by booking channel (0-100)';

-- =====================================================
-- STEP 2: Add Financial Breakdown
-- =====================================================

-- Base amount (before extras, taxes, fees)
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2);

COMMENT ON COLUMN property_bookings.base_amount IS
  'Base accommodation price before extras and fees';

-- Additional services amount
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS extras_amount DECIMAL(10,2);

COMMENT ON COLUMN property_bookings.extras_amount IS
  'Cost of additional services (airport pickup, extra cleaning, etc.)';

-- Tax amount
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);

COMMENT ON COLUMN property_bookings.tax_amount IS
  'Tax amount charged (sales tax, occupancy tax, etc.)';

-- Cleaning fee
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10,2);

COMMENT ON COLUMN property_bookings.cleaning_fee IS
  'One-time cleaning fee charged to guest';

-- Security deposit
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2);

COMMENT ON COLUMN property_bookings.security_deposit IS
  'Refundable security deposit amount';

-- =====================================================
-- STEP 3: Add Payment Status Tracking
-- =====================================================

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

COMMENT ON COLUMN property_bookings.payment_status IS
  'Payment lifecycle: pending, paid, partially_paid, refunded, cancelled';

-- =====================================================
-- STEP 4: Add Booking Identifiers
-- =====================================================

-- Unique confirmation code for guests
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS confirmation_code TEXT;

COMMENT ON COLUMN property_bookings.confirmation_code IS
  'Unique confirmation code provided to guest';

-- External booking ID (from Airbnb, Booking.com, etc.)
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS external_booking_id TEXT;

COMMENT ON COLUMN property_bookings.external_booking_id IS
  'Booking ID from external channel (Airbnb reservation ID, etc.)';

-- =====================================================
-- STEP 5: Add Guest Count Breakdown
-- =====================================================

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS guest_count_adults INTEGER;

COMMENT ON COLUMN property_bookings.guest_count_adults IS
  'Number of adult guests (age 18+)';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS guest_count_children INTEGER;

COMMENT ON COLUMN property_bookings.guest_count_children IS
  'Number of children guests (age 2-17)';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS guest_count_infants INTEGER;

COMMENT ON COLUMN property_bookings.guest_count_infants IS
  'Number of infant guests (age 0-2)';

-- =====================================================
-- STEP 6: Add Check-in/Check-out Times
-- =====================================================

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '15:00:00';

COMMENT ON COLUMN property_bookings.check_in_time IS
  'Expected check-in time (default: 3:00 PM)';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '11:00:00';

COMMENT ON COLUMN property_bookings.check_out_time IS
  'Expected check-out time (default: 11:00 AM)';

-- =====================================================
-- STEP 7: Add Cancellation Tracking
-- =====================================================

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

COMMENT ON COLUMN property_bookings.cancellation_policy IS
  'Cancellation policy applicable to this booking';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN property_bookings.cancelled_at IS
  'Timestamp when booking was cancelled';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(user_id);

COMMENT ON COLUMN property_bookings.cancelled_by IS
  'User who cancelled the booking';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN property_bookings.cancellation_reason IS
  'Reason for cancellation';

-- =====================================================
-- STEP 8: Add Actual Check-in/Check-out Timestamps
-- =====================================================

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN property_bookings.checked_in_at IS
  'Actual timestamp when guest checked in';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN property_bookings.checked_out_at IS
  'Actual timestamp when guest checked out';

-- =====================================================
-- STEP 9: Create Performance Indexes
-- =====================================================

-- Index for confirmation code lookups (used frequently)
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_code
  ON property_bookings(confirmation_code);

-- Index for external booking ID lookups (channel sync)
CREATE INDEX IF NOT EXISTS idx_bookings_external_id
  ON property_bookings(external_booking_id);

-- Index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON property_bookings(payment_status);

-- Index for booking channel analytics
CREATE INDEX IF NOT EXISTS idx_bookings_channel
  ON property_bookings(booking_channel);

-- Index for cancellation queries
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at
  ON property_bookings(cancelled_at)
  WHERE cancelled_at IS NOT NULL;

-- Composite index for financial reporting
CREATE INDEX IF NOT EXISTS idx_bookings_dates_status_channel
  ON property_bookings(check_in_date, check_out_date, booking_status, booking_channel);

-- =====================================================
-- STEP 10: Update RLS Policies (If Needed)
-- =====================================================

-- RLS policies are already permissive (USING true)
-- No changes needed for Phase 1

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  -- Verify all columns were added
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'property_bookings'
    AND column_name IN (
      'booking_channel', 'booking_source', 'channel_commission',
      'base_amount', 'extras_amount', 'tax_amount', 'cleaning_fee', 'security_deposit',
      'payment_status', 'confirmation_code', 'external_booking_id',
      'guest_count_adults', 'guest_count_children', 'guest_count_infants',
      'check_in_time', 'check_out_time',
      'cancellation_policy', 'cancelled_at', 'cancelled_by', 'cancellation_reason',
      'checked_in_at', 'checked_out_at'
    );

  IF col_count = 22 THEN
    RAISE NOTICE '✅ SUCCESS: All 22 new columns added successfully';
  ELSE
    RAISE WARNING '⚠️ WARNING: Expected 22 columns, found %', col_count;
  END IF;

  -- Verify indexes were created
  SELECT COUNT(*) INTO col_count
  FROM pg_indexes
  WHERE tablename = 'property_bookings'
    AND indexname IN (
      'idx_bookings_confirmation_code',
      'idx_bookings_external_id',
      'idx_bookings_payment_status',
      'idx_bookings_channel',
      'idx_bookings_cancelled_at',
      'idx_bookings_dates_status_channel'
    );

  IF col_count = 6 THEN
    RAISE NOTICE '✅ SUCCESS: All 6 indexes created successfully';
  ELSE
    RAISE WARNING '⚠️ WARNING: Expected 6 indexes, found %', col_count;
  END IF;
END $$;

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================

-- 1. All new columns are NULLABLE - existing code continues to work
-- 2. No data migration needed - existing rows get NULL for new columns
-- 3. Existing INSERT/UPDATE queries work without modification
-- 4. CSV exports will show new columns (currently NULL/empty)
-- 5. Next step: Update application code to use new fields (Phase 2)

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '✅ PHASE 1 MIGRATION COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Test existing booking functionality';
RAISE NOTICE '2. Update TypeScript schemas (src/lib/schemas.ts)';
RAISE NOTICE '3. Update UI components to use new fields';
RAISE NOTICE '4. Deploy code changes';
RAISE NOTICE '5. Run Phase 2 migration (add constraints)';
RAISE NOTICE '========================================';
