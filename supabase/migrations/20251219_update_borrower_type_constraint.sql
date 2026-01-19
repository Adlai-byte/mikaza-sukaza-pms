-- Update borrower_type constraint to only allow 'admin' and 'ops'

-- First, find and drop all check constraints on borrower_type
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'key_borrowings'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%borrower_type%'
    LOOP
        EXECUTE 'ALTER TABLE key_borrowings DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;

-- Add the new constraint with only admin and ops
ALTER TABLE key_borrowings ADD CONSTRAINT key_borrowings_borrower_type_check
    CHECK (borrower_type IN ('admin', 'ops'));
