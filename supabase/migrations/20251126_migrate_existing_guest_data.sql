-- =============================================
-- GUEST DATA MIGRATION
-- Migration: Populate guests table from existing bookings and invoices
-- Date: 2025-11-26
-- =============================================

-- IMPORTANT: This migration extracts guest data from property_bookings and invoices tables
-- It deduplicates by email and creates guest records with computed statistics

-- =============================================
-- STEP 1: EXTRACT AND INSERT UNIQUE GUESTS
-- =============================================

-- Insert guests from property_bookings (deduplicated by email)
-- We'll use DISTINCT ON to get one record per email with the most recent data

WITH booking_guests AS (
  SELECT DISTINCT ON (guest_email)
    guest_email,
    guest_name,
    guest_phone,
    created_at
  FROM public.property_bookings
  WHERE guest_email IS NOT NULL
    AND guest_email != ''
    AND guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' -- Valid email format
  ORDER BY guest_email, created_at DESC
),

invoice_guests AS (
  SELECT DISTINCT ON (guest_email)
    guest_email,
    guest_name,
    guest_phone,
    guest_address,
    created_at
  FROM public.invoices
  WHERE guest_email IS NOT NULL
    AND guest_email != ''
    AND guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' -- Valid email format
  ORDER BY guest_email, created_at DESC
),

-- Merge guests from both sources, preferring invoice data for address
combined_guests AS (
  SELECT
    COALESCE(b.guest_email, i.guest_email) AS email,
    COALESCE(i.guest_name, b.guest_name) AS full_name,
    COALESCE(i.guest_phone, b.guest_phone) AS phone,
    i.guest_address AS address,
    COALESCE(i.created_at, b.created_at) AS first_seen
  FROM booking_guests b
  FULL OUTER JOIN invoice_guests i ON b.guest_email = i.guest_email
),

-- Split full name into first and last name
parsed_guests AS (
  SELECT
    email,
    -- Try to split name into first and last
    CASE
      WHEN full_name IS NULL OR TRIM(full_name) = '' THEN 'Guest'
      WHEN position(' ' IN TRIM(full_name)) > 0 THEN
        TRIM(SUBSTRING(TRIM(full_name) FROM 1 FOR position(' ' IN TRIM(full_name)) - 1))
      ELSE TRIM(full_name)
    END AS first_name,
    CASE
      WHEN full_name IS NULL OR TRIM(full_name) = '' THEN email
      WHEN position(' ' IN TRIM(full_name)) > 0 THEN
        TRIM(SUBSTRING(TRIM(full_name) FROM position(' ' IN TRIM(full_name)) + 1))
      ELSE TRIM(full_name)
    END AS last_name,
    phone AS phone_primary,
    address,
    first_seen
  FROM combined_guests
)

-- Insert into guests table
INSERT INTO public.guests (
  email,
  first_name,
  last_name,
  phone_primary,
  address,
  created_at,
  updated_at
)
SELECT
  email,
  first_name,
  last_name,
  phone_primary,
  address,
  first_seen AS created_at,
  now() AS updated_at
FROM parsed_guests
ON CONFLICT (email) DO NOTHING; -- Skip if email already exists

-- =============================================
-- STEP 2: UPDATE PROPERTY_BOOKINGS WITH GUEST_ID
-- =============================================

UPDATE public.property_bookings pb
SET guest_id = g.guest_id
FROM public.guests g
WHERE pb.guest_email = g.email
  AND pb.guest_email IS NOT NULL
  AND pb.guest_email != ''
  AND pb.guest_id IS NULL;

-- =============================================
-- STEP 3: UPDATE INVOICES WITH GUEST_ID
-- =============================================

UPDATE public.invoices inv
SET guest_id = g.guest_id
FROM public.guests g
WHERE inv.guest_email = g.email
  AND inv.guest_email IS NOT NULL
  AND inv.guest_email != ''
  AND inv.guest_id IS NULL;

-- =============================================
-- STEP 4: COMPUTE AND UPDATE GUEST STATISTICS
-- =============================================

-- Update total_bookings count
UPDATE public.guests g
SET total_bookings = (
  SELECT COUNT(*)
  FROM public.property_bookings pb
  WHERE pb.guest_id = g.guest_id
);

-- Update last_booking_date
UPDATE public.guests g
SET last_booking_date = (
  SELECT MAX(pb.check_in_date)
  FROM public.property_bookings pb
  WHERE pb.guest_id = g.guest_id
);

-- Update total_spent (sum of all invoice total_amounts)
UPDATE public.guests g
SET total_spent = COALESCE((
  SELECT SUM(inv.total_amount)
  FROM public.invoices inv
  WHERE inv.guest_id = g.guest_id
    AND inv.status != 'cancelled'
), 0.00);

-- =============================================
-- STEP 5: CREATE TRIGGERS TO AUTO-UPDATE STATS
-- =============================================

-- Function to update guest stats when bookings change
CREATE OR REPLACE FUNCTION update_guest_stats_on_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the guest
  IF NEW.guest_id IS NOT NULL THEN
    UPDATE public.guests
    SET
      total_bookings = (
        SELECT COUNT(*)
        FROM public.property_bookings
        WHERE guest_id = NEW.guest_id
      ),
      last_booking_date = (
        SELECT MAX(check_in_date)
        FROM public.property_bookings
        WHERE guest_id = NEW.guest_id
      )
    WHERE guest_id = NEW.guest_id;
  END IF;

  -- Also update old guest if guest_id changed
  IF TG_OP = 'UPDATE' AND OLD.guest_id IS NOT NULL AND OLD.guest_id != NEW.guest_id THEN
    UPDATE public.guests
    SET
      total_bookings = (
        SELECT COUNT(*)
        FROM public.property_bookings
        WHERE guest_id = OLD.guest_id
      ),
      last_booking_date = (
        SELECT MAX(check_in_date)
        FROM public.property_bookings
        WHERE guest_id = OLD.guest_id
      )
    WHERE guest_id = OLD.guest_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking insert/update
DROP TRIGGER IF EXISTS trigger_update_guest_stats_booking ON public.property_bookings;

CREATE TRIGGER trigger_update_guest_stats_booking
  AFTER INSERT OR UPDATE OF guest_id, check_in_date
  ON public.property_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_stats_on_booking_change();

-- Function to update guest stats when invoices change
CREATE OR REPLACE FUNCTION update_guest_stats_on_invoice_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the guest
  IF NEW.guest_id IS NOT NULL THEN
    UPDATE public.guests
    SET total_spent = COALESCE((
      SELECT SUM(total_amount)
      FROM public.invoices
      WHERE guest_id = NEW.guest_id
        AND status != 'cancelled'
    ), 0.00)
    WHERE guest_id = NEW.guest_id;
  END IF;

  -- Also update old guest if guest_id changed
  IF TG_OP = 'UPDATE' AND OLD.guest_id IS NOT NULL AND OLD.guest_id != NEW.guest_id THEN
    UPDATE public.guests
    SET total_spent = COALESCE((
      SELECT SUM(total_amount)
      FROM public.invoices
      WHERE guest_id = OLD.guest_id
        AND status != 'cancelled'
    ), 0.00)
    WHERE guest_id = OLD.guest_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice insert/update
DROP TRIGGER IF EXISTS trigger_update_guest_stats_invoice ON public.invoices;

CREATE TRIGGER trigger_update_guest_stats_invoice
  AFTER INSERT OR UPDATE OF guest_id, total_amount, status
  ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_stats_on_invoice_change();

-- =============================================
-- STEP 6: VERIFICATION REPORT
-- =============================================

-- Display migration statistics
DO $$
DECLARE
  total_guests INTEGER;
  guests_with_bookings INTEGER;
  guests_with_invoices INTEGER;
  bookings_linked INTEGER;
  bookings_unlinked INTEGER;
  invoices_linked INTEGER;
  invoices_unlinked INTEGER;
BEGIN
  -- Count total guests created
  SELECT COUNT(*) INTO total_guests FROM public.guests;

  -- Count guests with bookings
  SELECT COUNT(DISTINCT guest_id) INTO guests_with_bookings
  FROM public.property_bookings WHERE guest_id IS NOT NULL;

  -- Count guests with invoices
  SELECT COUNT(DISTINCT guest_id) INTO guests_with_invoices
  FROM public.invoices WHERE guest_id IS NOT NULL;

  -- Count linked bookings
  SELECT COUNT(*) INTO bookings_linked
  FROM public.property_bookings WHERE guest_id IS NOT NULL;

  -- Count unlinked bookings
  SELECT COUNT(*) INTO bookings_unlinked
  FROM public.property_bookings WHERE guest_id IS NULL;

  -- Count linked invoices
  SELECT COUNT(*) INTO invoices_linked
  FROM public.invoices WHERE guest_id IS NOT NULL;

  -- Count unlinked invoices
  SELECT COUNT(*) INTO invoices_unlinked
  FROM public.invoices WHERE guest_id IS NULL;

  -- Display results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GUEST MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total guests created: %', total_guests;
  RAISE NOTICE 'Guests with bookings: %', guests_with_bookings;
  RAISE NOTICE 'Guests with invoices: %', guests_with_invoices;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Bookings linked to guests: %', bookings_linked;
  RAISE NOTICE 'Bookings NOT linked: %', bookings_unlinked;
  RAISE NOTICE 'Invoices linked to guests: %', invoices_linked;
  RAISE NOTICE 'Invoices NOT linked: %', invoices_unlinked;
  RAISE NOTICE '========================================';

  -- Warning if there are unlinked records
  IF bookings_unlinked > 0 OR invoices_unlinked > 0 THEN
    RAISE WARNING 'Some bookings/invoices could not be linked to guests. This usually happens when guest_email is NULL or invalid.';
  END IF;
END $$;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- NOTE: Legacy guest fields (guest_name, guest_email, guest_phone) are kept in
-- property_bookings and invoices tables for backward compatibility and rollback safety.
-- These can be removed in a future migration after confirming everything works correctly.
