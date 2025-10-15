-- ============================================================================
-- DIAGNOSTIC QUERIES FOR USERS TABLE ISSUE
-- Run these queries in Supabase SQL Editor to diagnose the problem
-- ============================================================================

-- 1. Check if users table exists and has data
SELECT
    'Users table check' as test,
    COUNT(*) as user_count,
    MAX(created_at) as latest_user
FROM users;

-- 2. Check RLS status on users table
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN '❌ RLS is ENABLED (blocking data)'
        ELSE '✅ RLS is DISABLED (should work)'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'users';

-- 3. Check RLS policies on users table (if any exist)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- 4. Check grants/permissions on users table
SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY grantee, privilege_type;

-- 5. Sample users data (first 3 rows)
SELECT
    user_id,
    email,
    first_name,
    last_name,
    user_type,
    is_active,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 3;

-- 6. Check if profiles table is in sync
SELECT
    'Profiles table check' as test,
    COUNT(*) as profile_count,
    MAX(created_at) as latest_profile
FROM profiles;

-- 7. Check for any differences between users and profiles
SELECT
    u.user_id,
    u.email,
    u.first_name,
    CASE
        WHEN p.id IS NULL THEN '❌ No profile'
        ELSE '✅ Has profile'
    END as profile_status
FROM users u
LEFT JOIN profiles p ON u.user_id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 8. Check current auth user (if running in authenticated context)
SELECT
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 1. Users table should have data (count > 0)
-- 2. RLS should be DISABLED (rowsecurity = false)
-- 3. No policies should exist (or they should allow SELECT)
-- 4. 'authenticated' role should have ALL privileges
-- 5. Sample data should be visible
-- 6. Profiles should exist for all users
-- 7. All users should have matching profiles
-- 8. Current role should be 'authenticated' or 'service_role'
-- ============================================================================

-- ============================================================================
-- QUICK FIX IF RLS IS STILL ENABLED
-- ============================================================================
-- If the diagnostic shows RLS is still enabled, run this:

-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- GRANT ALL ON public.users TO authenticated;

-- Then refresh your app and check again
-- ============================================================================
