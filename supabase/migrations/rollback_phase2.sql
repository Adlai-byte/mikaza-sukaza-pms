-- =====================================================
-- ROLLBACK PHASE 2: Remove Constraints & Validation
-- =====================================================
-- Description: Removes all constraints added in Phase 2 migration
-- Use Case: If constraints are too strict or causing issues
-- WARNING: Database will accept invalid data after this rollback
-- =====================================================

\set ON_ERROR_STOP on

BEGIN;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '⚠️  ROLLBACK PHASE 2 - REMOVING CONSTRAINTS';
RAISE NOTICE '========================================';

-- Remove unique indexes
DROP INDEX IF EXISTS idx_bookings_confirmation_code_unique;
DROP INDEX IF EXISTS idx_bookings_external_id_channel_unique;

RAISE NOTICE '✅ Dropped unique indexes';

-- Remove CHECK constraints
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS property_bookings_booking_status_check;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS booking_channel_check;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS payment_status_check;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS financial_amounts_non_negative;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS channel_commission_range;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS guest_counts_non_negative;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS guest_count_consistency;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS check_out_after_check_in;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS checked_in_timestamp_valid;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS checked_out_timestamp_valid;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS checked_out_after_checked_in;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS cancellation_status_consistency;
ALTER TABLE property_bookings DROP CONSTRAINT IF EXISTS blocked_bookings_no_guest_details;

RAISE NOTICE '✅ Dropped 13 CHECK constraints';

-- Restore old booking_status constraint (only 4 statuses)
ALTER TABLE property_bookings
  ADD CONSTRAINT property_bookings_booking_status_check
  CHECK (booking_status IS NULL OR booking_status IN (
    'pending', 'confirmed', 'cancelled', 'completed'
  ));

RAISE NOTICE '✅ Restored original booking_status constraint (4 statuses)';

-- Recreate simple indexes (non-unique)
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_code
  ON property_bookings(confirmation_code);

CREATE INDEX IF NOT EXISTS idx_bookings_external_id
  ON property_bookings(external_booking_id);

RAISE NOTICE '✅ Recreated non-unique indexes';

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '✅ PHASE 2 ROLLBACK COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'All constraints removed';
RAISE NOTICE 'Database now accepts any values in new fields';
RAISE NOTICE 'Original booking_status constraint restored';
RAISE NOTICE '========================================';
RAISE NOTICE '';
RAISE NOTICE '⚠️  WARNING: Database validation is now relaxed';
RAISE NOTICE 'Application code must validate all inputs';
RAISE NOTICE '========================================';
