-- Migration: Add multiple attachments and notes to expenses (financial entries)
-- Purpose: Enable financial entries to have multiple file attachments and timestamped notes
-- Date: 2025-12-09

-- ============================================
-- 1. Create expense_attachments table
-- ============================================
CREATE TABLE IF NOT EXISTS expense_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  caption TEXT,
  uploaded_by UUID REFERENCES users(user_id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE expense_attachments IS 'Stores multiple file attachments per financial entry/expense';
COMMENT ON COLUMN expense_attachments.expense_id IS 'Reference to parent expense/financial entry';
COMMENT ON COLUMN expense_attachments.caption IS 'Optional description of the attachment';
COMMENT ON COLUMN expense_attachments.file_url IS 'Public URL from Supabase storage';

-- Indexes for expense_attachments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_attachments_expense_id') THEN
    CREATE INDEX idx_expense_attachments_expense_id ON expense_attachments(expense_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_attachments
DROP POLICY IF EXISTS "expense_attachments_select_all" ON expense_attachments;
CREATE POLICY "expense_attachments_select_all" ON expense_attachments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "expense_attachments_insert_authenticated" ON expense_attachments;
CREATE POLICY "expense_attachments_insert_authenticated" ON expense_attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "expense_attachments_update_authenticated" ON expense_attachments;
CREATE POLICY "expense_attachments_update_authenticated" ON expense_attachments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "expense_attachments_delete_authenticated" ON expense_attachments;
CREATE POLICY "expense_attachments_delete_authenticated" ON expense_attachments
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- 2. Create expense_notes table
-- ============================================
CREATE TABLE IF NOT EXISTS expense_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  author_id UUID REFERENCES users(user_id),
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE expense_notes IS 'Stores multiple timestamped notes per financial entry/expense';
COMMENT ON COLUMN expense_notes.author_name IS 'Denormalized author name for display without joins';
COMMENT ON COLUMN expense_notes.note_text IS 'The note content';

-- Indexes for expense_notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_notes_expense_id') THEN
    CREATE INDEX idx_expense_notes_expense_id ON expense_notes(expense_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_notes_created_at') THEN
    CREATE INDEX idx_expense_notes_created_at ON expense_notes(expense_id, created_at DESC);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE expense_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_notes
DROP POLICY IF EXISTS "expense_notes_select_all" ON expense_notes;
CREATE POLICY "expense_notes_select_all" ON expense_notes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "expense_notes_insert_authenticated" ON expense_notes;
CREATE POLICY "expense_notes_insert_authenticated" ON expense_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "expense_notes_update_authenticated" ON expense_notes;
CREATE POLICY "expense_notes_update_authenticated" ON expense_notes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "expense_notes_delete_authenticated" ON expense_notes;
CREATE POLICY "expense_notes_delete_authenticated" ON expense_notes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- 3. Add triggers for updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_expense_attachments_updated_at ON expense_attachments;
CREATE TRIGGER update_expense_attachments_updated_at
  BEFORE UPDATE ON expense_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_notes_updated_at ON expense_notes;
CREATE TRIGGER update_expense_notes_updated_at
  BEFORE UPDATE ON expense_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
