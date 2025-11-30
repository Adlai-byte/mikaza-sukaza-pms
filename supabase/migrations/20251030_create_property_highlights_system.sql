-- Property Highlights System Migration
-- Creates table for managing property highlights (features, amenities, selling points)

-- 1. Property Highlights Table
CREATE TABLE IF NOT EXISTS property_highlights (
  highlight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_name VARCHAR(100), -- Icon identifier (e.g., 'beach', 'pool', 'wifi', 'parking')
  highlight_type VARCHAR(50) DEFAULT 'feature' CHECK (highlight_type IN ('feature', 'amenity', 'location', 'access', 'view', 'other')),
  photos JSONB DEFAULT '[]', -- Array of {url, caption, display_order}
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for performance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_highlights_property') THEN
    CREATE INDEX idx_highlights_property ON property_highlights(property_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_highlights_active') THEN
    CREATE INDEX idx_highlights_active ON property_highlights(is_active);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_highlights_type') THEN
    CREATE INDEX idx_highlights_type ON property_highlights(highlight_type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_highlights_display_order') THEN
    CREATE INDEX idx_highlights_display_order ON property_highlights(property_id, display_order);
  END IF;
END $$;

-- 3. Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE property_highlights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all highlights" ON property_highlights;
DROP POLICY IF EXISTS "Ops can manage highlights" ON property_highlights;
DROP POLICY IF EXISTS "Public can view active highlights" ON property_highlights;

-- Admins can manage all highlights
CREATE POLICY "Admins can manage all highlights"
  ON property_highlights
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Ops can manage highlights
CREATE POLICY "Ops can manage highlights"
  ON property_highlights
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('ops', 'admin')
    )
  );

-- Public can view active highlights (for public property listings)
CREATE POLICY "Public can view active highlights"
  ON property_highlights
  FOR SELECT
  USING (is_active = true);

-- 4. Update trigger
CREATE OR REPLACE FUNCTION update_property_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_property_highlights_updated_at ON property_highlights;
CREATE TRIGGER trigger_update_property_highlights_updated_at
  BEFORE UPDATE ON property_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_property_highlights_updated_at();

-- 5. Comments for documentation
COMMENT ON TABLE property_highlights IS 'Property highlights, features, and selling points with photos';
COMMENT ON COLUMN property_highlights.title IS 'Highlight title (e.g., "Ocean View", "Private Pool")';
COMMENT ON COLUMN property_highlights.icon_name IS 'Icon identifier for UI display (e.g., "beach", "pool", "wifi")';
COMMENT ON COLUMN property_highlights.highlight_type IS 'Category: feature, amenity, location, access, view, or other';
COMMENT ON COLUMN property_highlights.photos IS 'JSONB array of photos: [{url, caption, display_order}]';
COMMENT ON COLUMN property_highlights.display_order IS 'Sort order for displaying highlights (lower numbers first)';
