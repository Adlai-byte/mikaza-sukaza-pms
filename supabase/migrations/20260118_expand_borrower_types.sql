-- Expand borrower_type constraint to allow more types of borrowers
-- Previously only 'admin' and 'ops' were allowed, but in practice:
-- - Guests need keys when checking in
-- - Housekeepers need keys for cleaning
-- - Contractors/vendors need keys for maintenance

-- Drop the old constraint and add a new expanded one
ALTER TABLE key_borrowings
DROP CONSTRAINT IF EXISTS key_borrowings_borrower_type_check;

ALTER TABLE key_borrowings
ADD CONSTRAINT key_borrowings_borrower_type_check
CHECK (borrower_type IN ('admin', 'ops', 'guest', 'housekeeper', 'contractor', 'other'));

-- Update the comment to reflect the change
COMMENT ON COLUMN key_borrowings.borrower_type IS 'Type of borrower: admin, ops, guest, housekeeper, contractor, or other';
