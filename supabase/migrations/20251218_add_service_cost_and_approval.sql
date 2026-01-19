-- Migration: Add Service Cost entry type and approval functionality
-- Date: 2024-12-18
-- Description:
--   1. Adds 'service_cost' as a new entry_type (deduction like debit)
--   2. Adds 'is_approved' column for approval workflow
--   3. Only approved entries will be shown in reports

-- Step 1: Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expenses_entry_type_check'
  ) THEN
    ALTER TABLE expenses DROP CONSTRAINT expenses_entry_type_check;
  END IF;
END $$;

-- Step 2: Add new constraint with service_cost included
ALTER TABLE expenses
ADD CONSTRAINT expenses_entry_type_check
CHECK (entry_type IN ('credit', 'debit', 'owner_payment', 'service_cost'));

-- Step 3: Add is_approved column (default false for new entries)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Step 4: Add approved_by column to track who approved the entry
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(user_id);

-- Step 5: Add approved_at timestamp
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Step 6: Create index for approved entries (for faster report queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_expenses_is_approved'
  ) THEN
    CREATE INDEX idx_expenses_is_approved ON expenses(is_approved) WHERE is_approved = true;
  END IF;
END $$;

-- Step 7: Create index for entry_type filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_expenses_entry_type'
  ) THEN
    CREATE INDEX idx_expenses_entry_type ON expenses(entry_type);
  END IF;
END $$;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN expenses.is_approved IS 'Whether the financial entry has been approved. Only approved entries appear in reports.';
COMMENT ON COLUMN expenses.approved_by IS 'User ID of the person who approved this entry';
COMMENT ON COLUMN expenses.approved_at IS 'Timestamp when the entry was approved';
COMMENT ON COLUMN expenses.entry_type IS 'Type of financial entry: credit (income), debit (expense), owner_payment (payment to owner), service_cost (service deduction)';
