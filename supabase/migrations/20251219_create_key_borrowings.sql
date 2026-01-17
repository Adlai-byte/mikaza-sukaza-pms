-- Key Borrowings Migration
-- Tracks when keys are borrowed and returned, with deduction from category inventory

-- Create key_borrowings table
CREATE TABLE IF NOT EXISTS key_borrowings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    key_type TEXT NOT NULL CHECK (key_type IN ('house_key', 'mailbox_key', 'storage_key', 'remote_control')),
    category TEXT NOT NULL CHECK (category IN ('office', 'operational', 'housekeepers', 'extras')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

    -- Borrower information
    borrower_name TEXT NOT NULL,
    borrower_contact TEXT,
    borrower_type TEXT NOT NULL CHECK (borrower_type IN ('admin', 'ops')),

    -- Timestamps
    checked_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_return_date DATE,
    checked_in_at TIMESTAMPTZ,

    -- Who processed the transaction
    checked_out_by UUID NOT NULL REFERENCES auth.users(id),
    checked_in_by UUID REFERENCES auth.users(id),

    -- Status and notes
    status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_borrowings_property_id') THEN
        CREATE INDEX idx_key_borrowings_property_id ON key_borrowings(property_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_borrowings_status') THEN
        CREATE INDEX idx_key_borrowings_status ON key_borrowings(status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_borrowings_borrower_name') THEN
        CREATE INDEX idx_key_borrowings_borrower_name ON key_borrowings(borrower_name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_borrowings_checked_out_at') THEN
        CREATE INDEX idx_key_borrowings_checked_out_at ON key_borrowings(checked_out_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_borrowings_expected_return') THEN
        CREATE INDEX idx_key_borrowings_expected_return ON key_borrowings(expected_return_date) WHERE status = 'borrowed';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE key_borrowings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin and ops can view key borrowings" ON key_borrowings;
DROP POLICY IF EXISTS "Admin and ops can insert key borrowings" ON key_borrowings;
DROP POLICY IF EXISTS "Admin and ops can update key borrowings" ON key_borrowings;
DROP POLICY IF EXISTS "Admin can delete key borrowings" ON key_borrowings;

-- RLS Policies for key_borrowings
CREATE POLICY "Admin and ops can view key borrowings"
    ON key_borrowings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

CREATE POLICY "Admin and ops can insert key borrowings"
    ON key_borrowings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

CREATE POLICY "Admin and ops can update key borrowings"
    ON key_borrowings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

CREATE POLICY "Admin can delete key borrowings"
    ON key_borrowings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_key_borrowings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_key_borrowings_updated_at ON key_borrowings;
CREATE TRIGGER trigger_key_borrowings_updated_at
    BEFORE UPDATE ON key_borrowings
    FOR EACH ROW
    EXECUTE FUNCTION update_key_borrowings_updated_at();

-- Function to automatically mark overdue borrowings
CREATE OR REPLACE FUNCTION update_overdue_borrowings()
RETURNS void AS $$
BEGIN
    UPDATE key_borrowings
    SET status = 'overdue'
    WHERE status = 'borrowed'
    AND expected_return_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE key_borrowings IS 'Tracks key check-outs and returns with borrower information';
COMMENT ON COLUMN key_borrowings.category IS 'The category from which the key was borrowed (deducted)';
COMMENT ON COLUMN key_borrowings.borrower_type IS 'admin or ops - the type of staff borrowing the key';
COMMENT ON COLUMN key_borrowings.status IS 'borrowed = currently out, returned = checked back in, overdue = past expected return date';
