-- Check-in/Check-out System Migration (Safe version with IF NOT EXISTS)
-- Creates tables for property check-in/check-out management with checklists and signatures

-- 1. Checklist Templates (reusable templates per property/unit)
CREATE TABLE IF NOT EXISTS checklist_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('check_in', 'check_out', 'inspection')),
  description TEXT,
  checklist_items JSONB NOT NULL DEFAULT '[]', -- Array of {id, label, type (checkbox/text/photo), required, order}
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Check-in/Check-out Records (main records)
CREATE TABLE IF NOT EXISTS check_in_out_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('check_in', 'check_out')),
  record_date TIMESTAMPTZ NOT NULL,
  agent_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  resident_name VARCHAR(255),
  resident_contact VARCHAR(255),
  template_id UUID REFERENCES checklist_templates(template_id) ON DELETE SET NULL,
  checklist_responses JSONB DEFAULT '[]', -- Array of {item_id, response, notes, photo_urls}
  photos JSONB DEFAULT '[]', -- Array of {url, caption, timestamp}
  documents JSONB DEFAULT '[]', -- Array of {url, name, type, size}
  signature_data TEXT, -- Base64 encoded signature image
  signature_name VARCHAR(255),
  signature_date TIMESTAMPTZ,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  pdf_url TEXT, -- Generated PDF report URL
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance (using IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_checklist_templates_property') THEN
    CREATE INDEX idx_checklist_templates_property ON checklist_templates(property_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_checklist_templates_type') THEN
    CREATE INDEX idx_checklist_templates_type ON checklist_templates(template_type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_in_out_property') THEN
    CREATE INDEX idx_check_in_out_property ON check_in_out_records(property_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_in_out_type') THEN
    CREATE INDEX idx_check_in_out_type ON check_in_out_records(record_type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_in_out_date') THEN
    CREATE INDEX idx_check_in_out_date ON check_in_out_records(record_date);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_in_out_agent') THEN
    CREATE INDEX idx_check_in_out_agent ON check_in_out_records(agent_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_in_out_status') THEN
    CREATE INDEX idx_check_in_out_status ON check_in_out_records(status);
  END IF;
END $$;

-- 4. Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_out_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage all checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Ops can view checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Admins can manage all check-in/out records" ON check_in_out_records;
DROP POLICY IF EXISTS "Ops can manage check-in/out records" ON check_in_out_records;

-- Checklist Templates Policies
CREATE POLICY "Admins can manage all checklist templates"
  ON checklist_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Ops can view checklist templates"
  ON checklist_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('ops', 'admin')
    )
  );

-- Check-in/Out Records Policies
CREATE POLICY "Admins can manage all check-in/out records"
  ON check_in_out_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Ops can manage check-in/out records"
  ON check_in_out_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('ops', 'admin')
    )
  );

-- 5. Update triggers
CREATE OR REPLACE FUNCTION update_checklist_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_checklist_templates_updated_at ON checklist_templates;
CREATE TRIGGER trigger_update_checklist_templates_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_templates_updated_at();

CREATE OR REPLACE FUNCTION update_check_in_out_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_check_in_out_records_updated_at ON check_in_out_records;
CREATE TRIGGER trigger_update_check_in_out_records_updated_at
  BEFORE UPDATE ON check_in_out_records
  FOR EACH ROW
  EXECUTE FUNCTION update_check_in_out_records_updated_at();

-- 6. Comments for documentation
COMMENT ON TABLE checklist_templates IS 'Reusable checklist templates for check-in/check-out procedures';
COMMENT ON TABLE check_in_out_records IS 'Check-in and check-out records with checklists, photos, and signatures';
COMMENT ON COLUMN checklist_templates.checklist_items IS 'JSONB array of checklist items with structure: [{id, label, type, required, order}]';
COMMENT ON COLUMN check_in_out_records.checklist_responses IS 'JSONB array of responses: [{item_id, response, notes, photo_urls}]';
COMMENT ON COLUMN check_in_out_records.photos IS 'JSONB array of photos: [{url, caption, timestamp}]';
COMMENT ON COLUMN check_in_out_records.documents IS 'JSONB array of documents: [{url, name, type, size}]';
COMMENT ON COLUMN check_in_out_records.signature_data IS 'Base64 encoded signature image from canvas';
