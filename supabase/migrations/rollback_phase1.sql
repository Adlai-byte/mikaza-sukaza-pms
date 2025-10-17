-- =====================================================
-- ROLLBACK PHASE 1: Remove New Booking Fields
-- =====================================================
-- Description: Removes all columns added in Phase 1 migration
-- Use Case: If Phase 1 causes unexpected issues
-- WARNING: This will DELETE data in the new columns
-- =====================================================

\set ON_ERROR_STOP on

BEGIN;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '⚠️  ROLLBACK PHASE 1 - REMOVING COLUMNS';
RAISE NOTICE '========================================';
RAISE NOTICE 'This will delete all data in new columns!';
RAISE NOTICE '';

-- Remove indexes first
DROP INDEX IF EXISTS idx_bookings_confirmation_code;
DROP INDEX IF EXISTS idx_bookings_external_id;
DROP INDEX IF EXISTS idx_bookings_payment_status;
DROP INDEX IF EXISTS idx_bookings_channel;
DROP INDEX IF EXISTS idx_bookings_cancelled_at;
DROP INDEX IF EXISTS idx_bookings_dates_status_channel;

RAISE NOTICE '✅ Dropped 6 indexes';

-- Remove columns (in reverse order of creation)
ALTER TABLE property_bookings DROP COLUMN IF EXISTS checked_out_at;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS checked_in_at;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS cancelled_by;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS cancellation_policy;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS check_out_time;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS check_in_time;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS guest_count_infants;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS guest_count_children;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS guest_count_adults;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS external_booking_id;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS confirmation_code;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS payment_status;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS security_deposit;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS cleaning_fee;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS tax_amount;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS extras_amount;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS base_amount;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS channel_commission;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS booking_source;
ALTER TABLE property_bookings DROP COLUMN IF EXISTS booking_channel;

RAISE NOTICE '✅ Dropped 22 columns';

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '✅ PHASE 1 ROLLBACK COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'Database restored to pre-migration state';
RAISE NOTICE 'All new booking fields removed';
RAISE NOTICE '========================================';
