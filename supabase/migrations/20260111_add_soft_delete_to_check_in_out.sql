-- Migration: Add soft delete columns to check_in_out_records
-- Date: 2026-01-11
-- Description: Adds deleted_at and deleted_by columns for soft delete functionality,
--              allowing records to be "deleted" without permanent removal for audit compliance.

-- Add soft delete columns
ALTER TABLE check_in_out_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL REFERENCES users(user_id) ON DELETE SET NULL;

-- Create index for efficient filtering of non-deleted records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_in_out_records_deleted_at') THEN
    CREATE INDEX idx_check_in_out_records_deleted_at ON check_in_out_records(deleted_at) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN check_in_out_records.deleted_at IS 'Timestamp when record was soft-deleted, NULL if not deleted';
COMMENT ON COLUMN check_in_out_records.deleted_by IS 'User ID who deleted the record';
