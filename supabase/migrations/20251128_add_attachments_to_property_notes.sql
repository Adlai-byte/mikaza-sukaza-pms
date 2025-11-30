-- Add attachments column to property_notes table
-- Stores array of file attachments as JSONB
-- Format: [{"url": "...", "name": "...", "type": "...", "size": 123, "uploaded_at": "..."}]

ALTER TABLE property_notes
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN property_notes.attachments IS 'Array of file attachments with url, name, type, size, and uploaded_at';

-- Create index for potential queries on attachments
CREATE INDEX IF NOT EXISTS idx_property_notes_has_attachments
ON property_notes ((attachments != '[]'::jsonb));
