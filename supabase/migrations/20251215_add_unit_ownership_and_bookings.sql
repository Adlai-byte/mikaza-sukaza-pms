-- ============================================
-- MULTI-UNIT OWNERSHIP AND UNIT-LEVEL BOOKINGS
-- ============================================
-- This migration adds:
-- 1. owner_id to units table (allows different owners per unit)
-- 2. unit_id to property_bookings table (allows booking specific units)
-- 3. Helper function to get effective unit owner

-- ============================================
-- 1. ADD OWNER_ID TO UNITS TABLE
-- ============================================
-- Each unit can optionally have its own owner
-- If not set, the unit inherits ownership from the property

ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL;

-- Index for efficient owner lookups
CREATE INDEX IF NOT EXISTS idx_units_owner_id ON public.units(owner_id);

COMMENT ON COLUMN public.units.owner_id IS 'Optional unit-specific owner. If NULL, inherits from property owner.';

-- ============================================
-- 2. ADD UNIT_ID TO PROPERTY_BOOKINGS TABLE
-- ============================================
-- Bookings can target a specific unit or the entire property
-- NULL unit_id means the booking is for the entire property (all units blocked)

ALTER TABLE public.property_bookings
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(unit_id) ON DELETE SET NULL;

-- Index for efficient unit booking lookups
CREATE INDEX IF NOT EXISTS idx_property_bookings_unit_id ON public.property_bookings(unit_id);

COMMENT ON COLUMN public.property_bookings.unit_id IS 'Specific unit being booked. NULL means entire property (blocks all units).';

-- ============================================
-- 3. HELPER FUNCTION: GET EFFECTIVE UNIT OWNER
-- ============================================
-- Returns the unit's owner if set, otherwise returns the property owner

CREATE OR REPLACE FUNCTION public.get_effective_unit_owner(p_unit_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(u.owner_id, p.owner_id)
  FROM public.units u
  JOIN public.properties p ON p.property_id = u.property_id
  WHERE u.unit_id = p_unit_id;
$$;

COMMENT ON FUNCTION public.get_effective_unit_owner(UUID) IS 'Returns the effective owner of a unit (unit owner if set, otherwise property owner)';

-- ============================================
-- 4. BOOKING CONFLICT CHECK FUNCTION
-- ============================================
-- Checks if a new booking would conflict with existing bookings
-- Conflict rules:
-- - Unit booking conflicts with: same unit bookings + whole-property bookings
-- - Whole-property booking conflicts with: ANY booking for that property

CREATE OR REPLACE FUNCTION public.check_unit_booking_conflict(
  p_property_id UUID,
  p_unit_id UUID,  -- NULL means whole-property booking
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  IF p_unit_id IS NULL THEN
    -- Whole-property booking: conflicts with ANY existing booking for this property
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.property_bookings pb
    WHERE pb.property_id = p_property_id
      AND pb.status NOT IN ('cancelled', 'rejected')
      AND (p_exclude_booking_id IS NULL OR pb.booking_id != p_exclude_booking_id)
      AND pb.check_in < p_check_out
      AND pb.check_out > p_check_in;
  ELSE
    -- Unit-specific booking: conflicts with same unit OR whole-property bookings
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.property_bookings pb
    WHERE pb.property_id = p_property_id
      AND pb.status NOT IN ('cancelled', 'rejected')
      AND (p_exclude_booking_id IS NULL OR pb.booking_id != p_exclude_booking_id)
      AND pb.check_in < p_check_out
      AND pb.check_out > p_check_in
      AND (pb.unit_id = p_unit_id OR pb.unit_id IS NULL);
  END IF;

  RETURN v_conflict_count > 0;
END;
$$;

COMMENT ON FUNCTION public.check_unit_booking_conflict(UUID, UUID, DATE, DATE, UUID) IS 'Checks if a booking would conflict with existing bookings. Returns TRUE if conflict exists.';

-- ============================================
-- 5. LOG COMPLETION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Multi-unit ownership and unit-level bookings';
  RAISE NOTICE '- Added owner_id column to units table';
  RAISE NOTICE '- Added unit_id column to property_bookings table';
  RAISE NOTICE '- Created get_effective_unit_owner() function';
  RAISE NOTICE '- Created check_unit_booking_conflict() function';
END $$;
