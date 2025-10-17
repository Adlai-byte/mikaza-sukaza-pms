-- ============================================================================
-- FIX USER TYPE CASE ISSUE
-- ============================================================================
-- The RBAC system expects lowercase 'admin' and 'ops'
-- But your database has 'Administrator' and 'Ops' with capital letters
-- This script fixes that mismatch
-- ============================================================================

-- Check current user_type values
SELECT
    user_type,
    COUNT(*) as count
FROM users
GROUP BY user_type
ORDER BY user_type;

-- Expected: You'll see 'Administrator', 'Ops', or similar capitalized values

-- Fix: Update to lowercase
UPDATE users
SET user_type = LOWER(user_type);

-- If you have specific values, use this instead:
-- UPDATE users
-- SET user_type = CASE
--     WHEN user_type IN ('Administrator', 'ADMIN', 'Admin') THEN 'admin'
--     WHEN user_type IN ('Ops', 'OPS', 'Operations') THEN 'ops'
--     ELSE user_type
-- END;

-- Also update profiles table
UPDATE profiles
SET user_type = CASE
    WHEN user_type IN ('Administrator', 'ADMIN', 'Admin') THEN 'admin'
    WHEN user_type IN ('Ops', 'OPS', 'Operations') THEN 'ops'
    ELSE LOWER(user_type)
END;

-- Verify the fix
SELECT
    'After fix' as status,
    user_type,
    COUNT(*) as count
FROM users
GROUP BY user_type
ORDER BY user_type;

-- Expected result:
-- user_type  | count
-- -----------+------
-- admin      | X
-- ops        | Y

-- ============================================================================
-- IMPORTANT: After running this, LOG OUT and LOG BACK IN
-- This will refresh your session with the correct lowercase role
-- ============================================================================
