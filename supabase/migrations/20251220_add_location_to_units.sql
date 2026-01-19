-- ============================================
-- Migration: Add Location Fields to Units Table
-- Date: 2025-12-20
-- Description: Allows each unit to have its own location coordinates
--              separate from the parent property location
-- ============================================

-- Add location columns to units table
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.units.latitude IS 'Unit-specific latitude. If NULL, inherits from property location.';
COMMENT ON COLUMN public.units.longitude IS 'Unit-specific longitude. If NULL, inherits from property location.';
COMMENT ON COLUMN public.units.address IS 'Unit-specific street address. If NULL, inherits from property location.';
COMMENT ON COLUMN public.units.city IS 'Unit-specific city. If NULL, inherits from property location.';
COMMENT ON COLUMN public.units.state IS 'Unit-specific state/province. If NULL, inherits from property location.';
COMMENT ON COLUMN public.units.postal_code IS 'Unit-specific postal/zip code. If NULL, inherits from property location.';
COMMENT ON COLUMN public.units.country IS 'Unit-specific country. If NULL, inherits from property location.';

-- Create index for geographic queries on units
CREATE INDEX IF NOT EXISTS idx_units_location ON public.units(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
