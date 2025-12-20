-- Migration: Remove unit-specific location fields
-- Units will inherit location from their parent property
-- Date: 2025-12-20

-- Drop the location columns from units table
-- These were added in 20251220_add_location_to_units.sql but are no longer needed

ALTER TABLE units
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS country;

-- Add comment explaining the decision
COMMENT ON TABLE units IS 'Property units inherit location from their parent property via property_location table';
