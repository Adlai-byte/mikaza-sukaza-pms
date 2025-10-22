-- Add Foreign Key Constraint for property_bookings -> properties
-- This allows Supabase to understand the relationship and enable nested queries
-- Date: 2025-10-21

-- =============================================
-- 1. ADD FOREIGN KEY CONSTRAINT
-- =============================================

-- First, check if the foreign key already exists, if not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'property_bookings_property_id_fkey'
        AND table_name = 'property_bookings'
    ) THEN
        ALTER TABLE property_bookings
        ADD CONSTRAINT property_bookings_property_id_fkey
        FOREIGN KEY (property_id)
        REFERENCES properties(property_id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- =============================================
-- 2. ADD INDEX FOR PERFORMANCE (if not exists)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_property_bookings_property_id
ON property_bookings(property_id);

-- =============================================
-- 3. ADD COMMENT
-- =============================================

COMMENT ON CONSTRAINT property_bookings_property_id_fkey ON property_bookings
IS 'Foreign key relationship to properties table for nested queries';

-- =============================================
-- 4. VERIFY RELATIONSHIP
-- =============================================

-- Query to verify the foreign key exists
-- Run this to confirm:
-- SELECT
--   tc.constraint_name,
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.table_name = 'property_bookings'
--   AND tc.constraint_type = 'FOREIGN KEY';
