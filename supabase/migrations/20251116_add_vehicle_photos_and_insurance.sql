-- Migration: Add vehicle photos and enhanced insurance information
-- Created: 2025-11-16
-- Description: Adds vehicle_photos table and structured insurance fields to property_vehicles

-- ============================================================================
-- 1. CREATE VEHICLE PHOTOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_photos (
  photo_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.property_vehicles(vehicle_id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_title TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES public.users(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for vehicle_photos
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id ON public.vehicle_photos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_is_primary ON public.vehicle_photos(vehicle_id, is_primary) WHERE is_primary = TRUE;

-- Add comment
COMMENT ON TABLE public.vehicle_photos IS 'Stores photos for property vehicles';

-- ============================================================================
-- 2. ADD STRUCTURED INSURANCE FIELDS TO PROPERTY_VEHICLES
-- ============================================================================

-- Add new insurance-related columns
DO $$
BEGIN
  -- Insurance company name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'property_vehicles' AND column_name = 'insurance_company') THEN
    ALTER TABLE public.property_vehicles ADD COLUMN insurance_company TEXT;
  END IF;

  -- Insurance policy number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'property_vehicles' AND column_name = 'insurance_policy_number') THEN
    ALTER TABLE public.property_vehicles ADD COLUMN insurance_policy_number TEXT;
  END IF;

  -- Insurance expiry date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'property_vehicles' AND column_name = 'insurance_expiry_date') THEN
    ALTER TABLE public.property_vehicles ADD COLUMN insurance_expiry_date DATE;
  END IF;

  -- Insurance coverage amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'property_vehicles' AND column_name = 'insurance_coverage_amount') THEN
    ALTER TABLE public.property_vehicles ADD COLUMN insurance_coverage_amount DECIMAL(12,2);
  END IF;

  -- Insurance contact phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'property_vehicles' AND column_name = 'insurance_contact_phone') THEN
    ALTER TABLE public.property_vehicles ADD COLUMN insurance_contact_phone TEXT;
  END IF;

  -- Insurance document URL (for storing uploaded insurance certificate)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'property_vehicles' AND column_name = 'insurance_document_url') THEN
    ALTER TABLE public.property_vehicles ADD COLUMN insurance_document_url TEXT;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.property_vehicles.insurance_company IS 'Name of the insurance company';
COMMENT ON COLUMN public.property_vehicles.insurance_policy_number IS 'Insurance policy number';
COMMENT ON COLUMN public.property_vehicles.insurance_expiry_date IS 'Date when insurance expires';
COMMENT ON COLUMN public.property_vehicles.insurance_coverage_amount IS 'Coverage amount in currency';
COMMENT ON COLUMN public.property_vehicles.insurance_contact_phone IS 'Insurance company contact phone';
COMMENT ON COLUMN public.property_vehicles.insurance_document_url IS 'URL to uploaded insurance certificate';

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on vehicle_photos
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view vehicle photos" ON public.vehicle_photos;
DROP POLICY IF EXISTS "Users can insert vehicle photos" ON public.vehicle_photos;
DROP POLICY IF EXISTS "Users can update vehicle photos" ON public.vehicle_photos;
DROP POLICY IF EXISTS "Users can delete vehicle photos" ON public.vehicle_photos;

-- Create RLS policies for vehicle_photos
CREATE POLICY "Users can view vehicle photos"
  ON public.vehicle_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_vehicles pv
      WHERE pv.vehicle_id = vehicle_photos.vehicle_id
    )
  );

CREATE POLICY "Users can insert vehicle photos"
  ON public.vehicle_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_vehicles pv
      WHERE pv.vehicle_id = vehicle_photos.vehicle_id
    )
  );

CREATE POLICY "Users can update vehicle photos"
  ON public.vehicle_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.property_vehicles pv
      WHERE pv.vehicle_id = vehicle_photos.vehicle_id
    )
  );

CREATE POLICY "Users can delete vehicle photos"
  ON public.vehicle_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.property_vehicles pv
      WHERE pv.vehicle_id = vehicle_photos.vehicle_id
    )
  );

-- ============================================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Create updated_at trigger for vehicle_photos
CREATE OR REPLACE FUNCTION update_vehicle_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vehicle_photos_updated_at ON public.vehicle_photos;
CREATE TRIGGER trigger_update_vehicle_photos_updated_at
  BEFORE UPDATE ON public.vehicle_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_photos_updated_at();

-- ============================================================================
-- 5. CREATE HELPER FUNCTION TO SET PRIMARY PHOTO
-- ============================================================================

CREATE OR REPLACE FUNCTION set_vehicle_primary_photo(p_photo_id UUID)
RETURNS VOID AS $$
DECLARE
  v_vehicle_id UUID;
BEGIN
  -- Get the vehicle_id for this photo
  SELECT vehicle_id INTO v_vehicle_id
  FROM public.vehicle_photos
  WHERE photo_id = p_photo_id;

  -- Unset all other photos for this vehicle as primary
  UPDATE public.vehicle_photos
  SET is_primary = FALSE
  WHERE vehicle_id = v_vehicle_id
    AND photo_id != p_photo_id;

  -- Set the specified photo as primary
  UPDATE public.vehicle_photos
  SET is_primary = TRUE
  WHERE photo_id = p_photo_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_vehicle_primary_photo IS 'Sets a photo as the primary photo for a vehicle, unsetting all others';
