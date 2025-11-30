-- Migration: Add financial entry columns to expenses table
-- Purpose: Support Credit/Debit ledger system with scheduled entries for properties

-- Add entry_type column to distinguish between credits and debits
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) DEFAULT 'debit';

-- Add comment for entry_type
COMMENT ON COLUMN expenses.entry_type IS 'Type of financial entry: credit, debit, or owner_payment';

-- Add is_scheduled column for recurring/scheduled entries
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Add scheduled_day for day of month (1-31)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS scheduled_day INTEGER;

-- Add scheduled_months as array of months [1-12]
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS scheduled_months INTEGER[];

-- Add is_paid column to track payment status
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- Add paid_at timestamp
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for entry_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_entry_type_check'
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_entry_type_check
      CHECK (entry_type IN ('credit', 'debit', 'owner_payment'));
  END IF;
END $$;

-- Add constraint for scheduled_day range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_scheduled_day_check'
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_scheduled_day_check
      CHECK (scheduled_day IS NULL OR (scheduled_day >= 1 AND scheduled_day <= 31));
  END IF;
END $$;

-- Create index for entry_type filtering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_entry_type') THEN
    CREATE INDEX idx_expenses_entry_type ON expenses(entry_type);
  END IF;
END $$;

-- Create index for is_scheduled filtering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_is_scheduled') THEN
    CREATE INDEX idx_expenses_is_scheduled ON expenses(is_scheduled) WHERE is_scheduled = true;
  END IF;
END $$;

-- Create index for is_paid filtering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_is_paid') THEN
    CREATE INDEX idx_expenses_is_paid ON expenses(is_paid);
  END IF;
END $$;

-- Create composite index for property financial entries queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_property_date_type') THEN
    CREATE INDEX idx_expenses_property_date_type ON expenses(property_id, expense_date, entry_type);
  END IF;
END $$;
