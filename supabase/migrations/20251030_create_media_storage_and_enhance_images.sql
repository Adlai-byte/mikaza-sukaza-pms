-- ============================================
-- MEDIA MODULE: Storage Bucket & Schema Enhancement
-- ============================================

-- 1. Create property-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policies for property-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated users to update property images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-images');

-- Allow authenticated users to delete images
CREATE POLICY "Allow authenticated users to delete property images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-images');

-- Allow public read access to all property images
CREATE POLICY "Allow public read access to property images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

-- 3. Enhance property_images table with new fields
ALTER TABLE public.property_images
ADD COLUMN IF NOT EXISTS image_description TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 4. Create index on tags for faster filtering
CREATE INDEX IF NOT EXISTS idx_property_images_tags
ON public.property_images USING GIN (tags);

-- 5. Create index on property_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_images_property_id
ON public.property_images (property_id);

-- 6. Create index on is_primary for faster filtering
CREATE INDEX IF NOT EXISTS idx_property_images_is_primary
ON public.property_images (is_primary)
WHERE is_primary = true;

-- 7. Add constraint to ensure only one primary image per property
CREATE OR REPLACE FUNCTION enforce_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other images for this property to non-primary
    UPDATE public.property_images
    SET is_primary = false
    WHERE property_id = NEW.property_id
      AND image_id != NEW.image_id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_single_primary_image ON public.property_images;
CREATE TRIGGER trigger_enforce_single_primary_image
  BEFORE INSERT OR UPDATE ON public.property_images
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_image();

-- 8. Create view for media with property details
CREATE OR REPLACE VIEW public.property_images_with_details AS
SELECT
  pi.image_id,
  pi.property_id,
  pi.image_url,
  pi.image_title,
  pi.image_description,
  pi.is_primary,
  pi.display_order,
  pi.tags,
  pi.created_at,
  pi.updated_at,
  p.property_name,
  p.property_type,
  p.property_id as prop_id
FROM public.property_images pi
LEFT JOIN public.properties p ON pi.property_id = p.property_id
ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at DESC;

-- 9. Grant permissions on the view
GRANT SELECT ON public.property_images_with_details TO authenticated;
GRANT SELECT ON public.property_images_with_details TO anon;

-- 10. Add comment to table
COMMENT ON TABLE public.property_images IS 'Stores property photos and media assets with enhanced metadata for the Media module';
COMMENT ON COLUMN public.property_images.image_description IS 'Optional description of the image';
COMMENT ON COLUMN public.property_images.display_order IS 'Order in which images should be displayed (lower numbers first)';
COMMENT ON COLUMN public.property_images.tags IS 'Array of tags/categories for organizing images (e.g., "Exterior", "Kitchen", "Pool")';
