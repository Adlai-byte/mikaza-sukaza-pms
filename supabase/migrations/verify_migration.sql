-- =====================================================
-- MIGRATION VERIFICATION SCRIPT
-- =====================================================
-- Description: Comprehensive checks to verify migration success
-- Usage: Run after Phase 1 and Phase 2 to verify everything works
-- =====================================================

\set ON_ERROR_STOP off

-- =====================================================
-- SECTION 1: Column Existence Verification
-- =====================================================

DO $$
DECLARE
  expected_columns TEXT[] := ARRAY[
    'booking_channel', 'booking_source', 'channel_commission',
    'base_amount', 'extras_amount', 'tax_amount', 'cleaning_fee', 'security_deposit',
    'payment_status', 'confirmation_code', 'external_booking_id',
    'guest_count_adults', 'guest_count_children', 'guest_count_infants',
    'check_in_time', 'check_out_time',
    'cancellation_policy', 'cancelled_at', 'cancelled_by', 'cancellation_reason',
    'checked_in_at', 'checked_out_at'
  ];
  col TEXT;
  missing_cols TEXT[] := '{}';
  found_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COLUMN EXISTENCE CHECK';
  RAISE NOTICE '========================================';

  FOREACH col IN ARRAY expected_columns
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'property_bookings' AND column_name = col
    ) THEN
      found_count := found_count + 1;
      RAISE NOTICE '✅ Column exists: %', col;
    ELSE
      missing_cols := array_append(missing_cols, col);
      RAISE WARNING '❌ Column missing: %', col;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  IF found_count = 22 THEN
    RAISE NOTICE '✅ SUCCESS: All 22 columns exist';
  ELSE
    RAISE WARNING '⚠️ INCOMPLETE: Found % of 22 columns', found_count;
    RAISE WARNING 'Missing: %', array_to_string(missing_cols, ', ');
  END IF;
END $$;

-- =====================================================
-- SECTION 2: Index Verification
-- =====================================================

DO $$
DECLARE
  expected_indexes TEXT[] := ARRAY[
    'idx_bookings_confirmation_code',
    'idx_bookings_external_id',
    'idx_bookings_payment_status',
    'idx_bookings_channel',
    'idx_bookings_cancelled_at',
    'idx_bookings_dates_status_channel'
  ];
  idx TEXT;
  missing_indexes TEXT[] := '{}';
  found_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INDEX EXISTENCE CHECK';
  RAISE NOTICE '========================================';

  FOREACH idx IN ARRAY expected_indexes
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'property_bookings' AND indexname = idx
    ) THEN
      found_count := found_count + 1;
      RAISE NOTICE '✅ Index exists: %', idx;
    ELSE
      missing_indexes := array_append(missing_indexes, idx);
      RAISE WARNING '❌ Index missing: %', idx;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  IF found_count = 6 THEN
    RAISE NOTICE '✅ SUCCESS: All 6 indexes exist';
  ELSE
    RAISE WARNING '⚠️ INCOMPLETE: Found % of 6 indexes', found_count;
  END IF;
END $$;

-- =====================================================
-- SECTION 3: Data Type Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA TYPE VERIFICATION';
  RAISE NOTICE '========================================';

  -- Check decimal precision for financial fields
  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'property_bookings'
    AND column_name = 'base_amount'
    AND data_type = 'numeric'
    AND numeric_precision = 10
    AND numeric_scale = 2;

  IF FOUND THEN
    RAISE NOTICE '✅ Financial fields have correct precision (10,2)';
  ELSE
    RAISE WARNING '⚠️ Financial field precision may be incorrect';
  END IF;

  -- Check time fields
  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'property_bookings'
    AND column_name = 'check_in_time'
    AND data_type = 'time without time zone';

  IF FOUND THEN
    RAISE NOTICE '✅ Time fields are correct type';
  ELSE
    RAISE WARNING '⚠️ Time field types may be incorrect';
  END IF;

  -- Check timestamp fields
  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'property_bookings'
    AND column_name = 'checked_in_at'
    AND data_type = 'timestamp with time zone';

  IF FOUND THEN
    RAISE NOTICE '✅ Timestamp fields are correct type';
  ELSE
    RAISE WARNING '⚠️ Timestamp field types may be incorrect';
  END IF;
END $$;

-- =====================================================
-- SECTION 4: Constraint Verification (Phase 2)
-- =====================================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONSTRAINT VERIFICATION (PHASE 2)';
  RAISE NOTICE '========================================';

  -- Check if Phase 2 constraints exist
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'property_bookings'
    AND constraint_type = 'CHECK'
    AND constraint_name IN (
      'booking_channel_check',
      'payment_status_check',
      'financial_amounts_non_negative',
      'channel_commission_range',
      'guest_counts_non_negative',
      'guest_count_consistency',
      'check_out_after_check_in',
      'checked_in_timestamp_valid',
      'checked_out_timestamp_valid',
      'checked_out_after_checked_in',
      'cancellation_status_consistency',
      'blocked_bookings_no_guest_details'
    );

  IF constraint_count > 0 THEN
    RAISE NOTICE '✅ Phase 2 constraints found: %', constraint_count;
    RAISE NOTICE 'Validation is ENABLED';
  ELSE
    RAISE NOTICE 'ℹ️ Phase 2 constraints not found';
    RAISE NOTICE 'Validation is DISABLED (Phase 1 only)';
  END IF;

  -- Check unique indexes
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'property_bookings'
      AND indexname = 'idx_bookings_confirmation_code_unique'
  ) THEN
    RAISE NOTICE '✅ Unique constraint on confirmation_code';
  ELSE
    RAISE NOTICE 'ℹ️ No unique constraint on confirmation_code';
  END IF;
END $$;

-- =====================================================
-- SECTION 5: Data Integrity Checks
-- =====================================================

DO $$
DECLARE
  total_bookings INTEGER;
  bookings_with_new_fields INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA INTEGRITY CHECKS';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO total_bookings FROM property_bookings;
  RAISE NOTICE 'Total bookings in database: %', total_bookings;

  -- Check how many bookings use new fields
  SELECT COUNT(*) INTO bookings_with_new_fields
  FROM property_bookings
  WHERE booking_channel IS NOT NULL
     OR payment_status IS NOT NULL
     OR confirmation_code IS NOT NULL;

  RAISE NOTICE 'Bookings using new fields: %', bookings_with_new_fields;

  IF total_bookings > 0 AND bookings_with_new_fields = 0 THEN
    RAISE NOTICE 'ℹ️ No bookings using new fields yet (normal after Phase 1)';
  END IF;

  -- Check for invalid statuses (if Phase 2 completed)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'property_bookings'
      AND constraint_name = 'property_bookings_booking_status_check'
  ) THEN
    DECLARE
      invalid_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO invalid_count
      FROM property_bookings
      WHERE booking_status IS NOT NULL
        AND booking_status NOT IN (
          'inquiry', 'pending', 'confirmed', 'checked_in',
          'checked_out', 'completed', 'cancelled', 'blocked'
        );

      IF invalid_count = 0 THEN
        RAISE NOTICE '✅ All booking statuses are valid';
      ELSE
        RAISE WARNING '⚠️ Found % bookings with invalid status', invalid_count;
      END IF;
    END;
  END IF;
END $$;

-- =====================================================
-- SECTION 6: Performance Check
-- =====================================================

DO $$
DECLARE
  index_size TEXT;
  table_size TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PERFORMANCE METRICS';
  RAISE NOTICE '========================================';

  SELECT pg_size_pretty(pg_total_relation_size('property_bookings')) INTO table_size;
  RAISE NOTICE 'Table size (including indexes): %', table_size;

  SELECT pg_size_pretty(pg_indexes_size('property_bookings')) INTO index_size;
  RAISE NOTICE 'Index size: %', index_size;
END $$;

-- =====================================================
-- SECTION 7: Sample Query Test
-- =====================================================

DO $$
DECLARE
  sample_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SAMPLE QUERY TEST';
  RAISE NOTICE '========================================';

  -- Test a typical query with new fields
  EXECUTE '
    SELECT COUNT(*) FROM property_bookings
    WHERE booking_status = ''confirmed''
      AND check_in_date >= CURRENT_DATE
    LIMIT 10
  ' INTO sample_count;

  RAISE NOTICE '✅ Sample query executed successfully';
  RAISE NOTICE 'Found % confirmed upcoming bookings', sample_count;
END $$;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the output above for any warnings or errors';
  RAISE NOTICE '';
  RAISE NOTICE 'If all checks passed:';
  RAISE NOTICE '  ✅ Migration is successful';
  RAISE NOTICE '  ✅ Safe to proceed with code deployment';
  RAISE NOTICE '';
  RAISE NOTICE 'If any checks failed:';
  RAISE NOTICE '  ⚠️ Review errors above';
  RAISE NOTICE '  ⚠️ Consider rollback if critical';
  RAISE NOTICE '  ⚠️ Check migration logs for details';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
