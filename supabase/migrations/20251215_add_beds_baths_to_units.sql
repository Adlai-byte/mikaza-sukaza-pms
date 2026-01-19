-- Migration: Add beds and baths columns to units table
-- This allows individual units to have their own bedroom/bathroom counts
-- Property-level beds/baths are kept for single properties without units

-- Add columns to units table
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS num_bedrooms INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS num_bathrooms NUMERIC(3,1) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.units.num_bedrooms IS 'Number of bedrooms in this unit. NULL means not specified or inherits from property.';
COMMENT ON COLUMN public.units.num_bathrooms IS 'Number of bathrooms in this unit (supports half baths like 1.5). NULL means not specified or inherits from property.';

-- Create index for filtering by beds/baths
CREATE INDEX IF NOT EXISTS idx_units_bedrooms ON public.units(num_bedrooms) WHERE num_bedrooms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_bathrooms ON public.units(num_bathrooms) WHERE num_bathrooms IS NOT NULL;
