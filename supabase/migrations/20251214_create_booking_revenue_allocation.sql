-- Migration: Create booking_revenue_allocation table
-- Purpose: Track revenue allocation for entire-property bookings across unit owners
-- When unit_id is NULL (entire property booking), revenue is split among unit owners

-- =============================================================================
-- 1. CREATE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_revenue_allocation (
  allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES property_bookings(booking_id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(unit_id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  share_percentage DECIMAL(5,2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
  allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique allocation per booking-unit combination
  CONSTRAINT unique_booking_unit_allocation UNIQUE (booking_id, unit_id)
);

-- Add comment for documentation
COMMENT ON TABLE booking_revenue_allocation IS 'Tracks revenue allocation for entire-property bookings split among unit owners';
COMMENT ON COLUMN booking_revenue_allocation.share_percentage IS 'Percentage share of the booking revenue (0-100)';
COMMENT ON COLUMN booking_revenue_allocation.allocated_amount IS 'Calculated amount based on share_percentage and booking total';

-- =============================================================================
-- 2. CREATE INDEXES
-- =============================================================================

DO $$
BEGIN
  -- Index for querying allocations by booking
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revenue_allocation_booking') THEN
    CREATE INDEX idx_revenue_allocation_booking ON booking_revenue_allocation(booking_id);
  END IF;

  -- Index for querying allocations by owner (for owner statements)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revenue_allocation_owner') THEN
    CREATE INDEX idx_revenue_allocation_owner ON booking_revenue_allocation(owner_id);
  END IF;

  -- Index for querying allocations by unit
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revenue_allocation_unit') THEN
    CREATE INDEX idx_revenue_allocation_unit ON booking_revenue_allocation(unit_id);
  END IF;

  -- Composite index for date-range owner queries
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revenue_allocation_owner_created') THEN
    CREATE INDEX idx_revenue_allocation_owner_created ON booking_revenue_allocation(owner_id, created_at);
  END IF;
END $$;

-- =============================================================================
-- 3. ENABLE RLS
-- =============================================================================

ALTER TABLE booking_revenue_allocation ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. CREATE RLS POLICIES
-- =============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin full access to revenue allocations" ON booking_revenue_allocation;
DROP POLICY IF EXISTS "Ops can view revenue allocations" ON booking_revenue_allocation;
DROP POLICY IF EXISTS "Owners can view their allocations" ON booking_revenue_allocation;

-- Admin: Full access
CREATE POLICY "Admin full access to revenue allocations"
  ON booking_revenue_allocation
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Ops: Read access
CREATE POLICY "Ops can view revenue allocations"
  ON booking_revenue_allocation
  FOR SELECT
  USING (get_user_role() = 'ops');

-- Owners (customers): Can view their own allocations
CREATE POLICY "Owners can view their allocations"
  ON booking_revenue_allocation
  FOR SELECT
  USING (owner_id = get_user_id());

-- =============================================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- =============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_booking_revenue_allocation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_revenue_allocation_updated_at ON booking_revenue_allocation;
CREATE TRIGGER trigger_update_revenue_allocation_updated_at
  BEFORE UPDATE ON booking_revenue_allocation
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_revenue_allocation_updated_at();

-- =============================================================================
-- 6. CREATE HELPER FUNCTION TO CALCULATE ALLOCATIONS
-- =============================================================================

-- Function to create revenue allocations for an entire-property booking
CREATE OR REPLACE FUNCTION create_booking_revenue_allocations(
  p_booking_id UUID,
  p_property_id UUID,
  p_total_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
  v_unit_count INT;
  v_share_percentage DECIMAL(5,2);
  v_allocated_amount DECIMAL(10,2);
  v_unit RECORD;
BEGIN
  -- Delete any existing allocations for this booking
  DELETE FROM booking_revenue_allocation WHERE booking_id = p_booking_id;

  -- Get count of units for this property
  SELECT COUNT(*) INTO v_unit_count
  FROM units
  WHERE property_id = p_property_id;

  -- If no units, allocate 100% to property owner
  IF v_unit_count = 0 THEN
    INSERT INTO booking_revenue_allocation (booking_id, unit_id, owner_id, share_percentage, allocated_amount)
    SELECT
      p_booking_id,
      NULL,
      p.owner_id,
      100.00,
      p_total_amount
    FROM properties p
    WHERE p.property_id = p_property_id;
    RETURN;
  END IF;

  -- Calculate equal share percentage
  v_share_percentage := ROUND(100.00 / v_unit_count, 2);

  -- Create allocation for each unit
  FOR v_unit IN
    SELECT
      u.unit_id,
      COALESCE(u.owner_id, p.owner_id) AS effective_owner_id
    FROM units u
    JOIN properties p ON p.property_id = u.property_id
    WHERE u.property_id = p_property_id
  LOOP
    -- Calculate allocated amount (handle rounding)
    v_allocated_amount := ROUND(p_total_amount * v_share_percentage / 100, 2);

    INSERT INTO booking_revenue_allocation (booking_id, unit_id, owner_id, share_percentage, allocated_amount)
    VALUES (p_booking_id, v_unit.unit_id, v_unit.effective_owner_id, v_share_percentage, v_allocated_amount);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_booking_revenue_allocations(UUID, UUID, DECIMAL) TO authenticated;

-- =============================================================================
-- 7. CREATE VIEW FOR OWNER REVENUE SUMMARY
-- =============================================================================

CREATE OR REPLACE VIEW owner_revenue_summary AS
SELECT
  bra.owner_id,
  u.first_name || ' ' || u.last_name AS owner_name,
  u.email AS owner_email,
  DATE_TRUNC('month', pb.check_in_date) AS revenue_month,
  p.property_id,
  p.property_name,
  un.unit_id,
  un.property_name AS unit_name,
  COUNT(DISTINCT bra.booking_id) AS booking_count,
  SUM(bra.allocated_amount) AS total_allocated_revenue,
  AVG(bra.share_percentage) AS avg_share_percentage
FROM booking_revenue_allocation bra
JOIN property_bookings pb ON pb.booking_id = bra.booking_id
JOIN properties p ON p.property_id = pb.property_id
JOIN users u ON u.user_id = bra.owner_id
LEFT JOIN units un ON un.unit_id = bra.unit_id
WHERE pb.booking_status NOT IN ('cancelled')
GROUP BY
  bra.owner_id,
  u.first_name,
  u.last_name,
  u.email,
  DATE_TRUNC('month', pb.check_in_date),
  p.property_id,
  p.property_name,
  un.unit_id,
  un.property_name;

-- Grant access to the view
GRANT SELECT ON owner_revenue_summary TO authenticated;

COMMENT ON VIEW owner_revenue_summary IS 'Aggregated revenue summary by owner, property, and unit for financial reporting';
