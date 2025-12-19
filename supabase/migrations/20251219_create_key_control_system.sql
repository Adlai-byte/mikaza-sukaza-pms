-- Key Control System Migration
-- Creates tables for managing key inventory and tracking transactions across properties

-- Create key_inventory table
CREATE TABLE IF NOT EXISTS key_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('office', 'operational', 'housekeepers', 'extras')),
    key_type TEXT NOT NULL CHECK (key_type IN ('house_key', 'mailbox_key', 'storage_key', 'remote_control')),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(property_id, category, key_type)
);

-- Create key_transactions table for audit log
CREATE TABLE IF NOT EXISTS key_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    key_type TEXT NOT NULL CHECK (key_type IN ('house_key', 'mailbox_key', 'storage_key', 'remote_control')),
    from_category TEXT NOT NULL CHECK (from_category IN ('office', 'operational', 'housekeepers', 'extras')),
    to_category TEXT NOT NULL CHECK (to_category IN ('office', 'operational', 'housekeepers', 'extras')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_inventory_property_id') THEN
        CREATE INDEX idx_key_inventory_property_id ON key_inventory(property_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_inventory_category') THEN
        CREATE INDEX idx_key_inventory_category ON key_inventory(category);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_transactions_property_id') THEN
        CREATE INDEX idx_key_transactions_property_id ON key_transactions(property_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_transactions_created_at') THEN
        CREATE INDEX idx_key_transactions_created_at ON key_transactions(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_key_transactions_performed_by') THEN
        CREATE INDEX idx_key_transactions_performed_by ON key_transactions(performed_by);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE key_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin and ops can view key inventory" ON key_inventory;
DROP POLICY IF EXISTS "Admin and ops can insert key inventory" ON key_inventory;
DROP POLICY IF EXISTS "Admin and ops can update key inventory" ON key_inventory;
DROP POLICY IF EXISTS "Admin can delete key inventory" ON key_inventory;
DROP POLICY IF EXISTS "Admin and ops can view key transactions" ON key_transactions;
DROP POLICY IF EXISTS "Admin and ops can insert key transactions" ON key_transactions;

-- RLS Policies for key_inventory
CREATE POLICY "Admin and ops can view key inventory"
    ON key_inventory FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

CREATE POLICY "Admin and ops can insert key inventory"
    ON key_inventory FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

CREATE POLICY "Admin and ops can update key inventory"
    ON key_inventory FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

CREATE POLICY "Admin can delete key inventory"
    ON key_inventory FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- RLS Policies for key_transactions
CREATE POLICY "Admin and ops can view key transactions"
    ON key_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

CREATE POLICY "Admin and ops can insert key transactions"
    ON key_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.user_type IN ('admin', 'ops')
        )
    );

-- Create trigger for updated_at on key_inventory
CREATE OR REPLACE FUNCTION update_key_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_key_inventory_updated_at ON key_inventory;
CREATE TRIGGER trigger_key_inventory_updated_at
    BEFORE UPDATE ON key_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_key_inventory_updated_at();

-- Add comments for documentation
COMMENT ON TABLE key_inventory IS 'Stores key and remote control quantities per property, category, and key type';
COMMENT ON TABLE key_transactions IS 'Audit log for key transfers between categories';
COMMENT ON COLUMN key_inventory.category IS 'office = main inventory, operational = ops team, housekeepers = cleaning staff, extras = spare keys';
COMMENT ON COLUMN key_inventory.key_type IS 'house_key, mailbox_key, storage_key, remote_control';
