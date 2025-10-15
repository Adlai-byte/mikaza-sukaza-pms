-- Add provider and customer user types to the users table
-- Date: 2025-01-16

-- ============================================
-- UPDATE USER TYPE CONSTRAINT
-- ============================================

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Add new constraint with provider and customer types
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('admin', 'ops', 'provider', 'customer'));

-- ============================================
-- VERIFICATION
-- ============================================

-- Show the updated constraint
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname = 'users_user_type_check';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ User types updated successfully';
    RAISE NOTICE '✅ Available user types: admin, ops, provider, customer';
    RAISE NOTICE '✅ Admin: Full system access';
    RAISE NOTICE '✅ Ops: Operations management';
    RAISE NOTICE '✅ Provider: Service provider/vendor access';
    RAISE NOTICE '✅ Customer: Property owner/guest access';
END $$;
