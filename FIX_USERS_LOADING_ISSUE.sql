-- ============================================================================
-- FIX USERS LOADING ISSUE - Only 1 User Showing
-- ============================================================================
-- This fixes the RLS issue causing only 1 user to be visible in User Management
--
-- DIAGNOSTIC + FIX SCRIPT
-- Run this in Supabase SQL Editor and check the output
-- ============================================================================

-- Step 1: Diagnose the problem
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    user_count INTEGER;
    anon_visible_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSING USERS TABLE ISSUE';
    RAISE NOTICE '========================================';

    -- Check if RLS is enabled
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'users';

    RAISE NOTICE 'RLS Enabled: %', rls_enabled;

    -- Count active policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users';

    RAISE NOTICE 'Active Policies: %', policy_count;

    -- Count total users
    SELECT COUNT(*) INTO user_count FROM public.users;
    RAISE NOTICE 'Total Users in DB: %', user_count;

    -- Check what anon role can see
    BEGIN
        SET LOCAL ROLE anon;
        SELECT COUNT(*) INTO anon_visible_count FROM public.users;
        RESET ROLE;
        RAISE NOTICE 'Users Visible to App (anon role): %', anon_visible_count;
    EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        RAISE NOTICE 'Users Visible to App: ERROR - %', SQLERRM;
        anon_visible_count := 0;
    END;

    RAISE NOTICE '========================================';

    -- Diagnose the issue
    IF rls_enabled AND anon_visible_count < user_count THEN
        RAISE WARNING '❌ PROBLEM FOUND: RLS is blocking access!';
        RAISE WARNING '   - RLS is ENABLED';
        RAISE WARNING '   - % policies exist', policy_count;
        RAISE WARNING '   - App can only see % out of % users', anon_visible_count, user_count;
    ELSIF NOT rls_enabled AND anon_visible_count < user_count THEN
        RAISE WARNING '❌ PROBLEM FOUND: Permission issue!';
        RAISE WARNING '   - RLS is DISABLED but users still not visible';
        RAISE WARNING '   - This is a permission/grant issue';
    ELSE
        RAISE NOTICE '✅ No RLS issues detected';
    END IF;
END $$;

-- Step 2: Show existing policies (before removal)
DO $$
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Current Policies on users table:';

    FOR pol IN
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        RAISE NOTICE '  - % (%) - USING: %', pol.policyname, pol.cmd, pol.qual;
    END LOOP;
END $$;

-- Step 3: DISABLE RLS and DROP POLICIES
DO $$
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Disabling RLS...';

    -- Disable RLS
    ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

    RAISE NOTICE '✓ RLS disabled';
    RAISE NOTICE '';
    RAISE NOTICE 'Dropping all policies...';

    -- Drop all policies
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
        RAISE NOTICE '  ✓ Dropped: %', pol.policyname;
    END LOOP;
END $$;

-- Step 4: GRANT PERMISSIONS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Granting permissions...';

    -- Revoke existing permissions first
    REVOKE ALL ON public.users FROM anon;
    REVOKE ALL ON public.users FROM authenticated;
    REVOKE ALL ON public.users FROM service_role;

    -- Grant new permissions
    GRANT ALL ON public.users TO anon;
    GRANT ALL ON public.users TO authenticated;
    GRANT ALL ON public.users TO service_role;

    -- Ensure schema usage
    GRANT USAGE ON SCHEMA public TO anon;
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT USAGE ON SCHEMA public TO service_role;

    RAISE NOTICE '  ✓ Permissions granted to anon role';
    RAISE NOTICE '  ✓ Permissions granted to authenticated role';
    RAISE NOTICE '  ✓ Permissions granted to service_role';
END $$;

-- Step 5: VERIFY THE FIX
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    user_count INTEGER;
    anon_visible_count INTEGER;
    auth_visible_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION - AFTER FIX';
    RAISE NOTICE '========================================';

    -- Check RLS status
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'users';

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users';

    -- Count users
    SELECT COUNT(*) INTO user_count FROM public.users;

    -- Test anon role access
    BEGIN
        SET LOCAL ROLE anon;
        SELECT COUNT(*) INTO anon_visible_count FROM public.users;
        RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        anon_visible_count := 0;
    END;

    -- Test authenticated role access
    BEGIN
        SET LOCAL ROLE authenticated;
        SELECT COUNT(*) INTO auth_visible_count FROM public.users;
        RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        auth_visible_count := 0;
    END;

    RAISE NOTICE 'RLS Enabled: %', rls_enabled;
    RAISE NOTICE 'Active Policies: %', policy_count;
    RAISE NOTICE 'Total Users: %', user_count;
    RAISE NOTICE 'Visible to anon: %', anon_visible_count;
    RAISE NOTICE 'Visible to authenticated: %', auth_visible_count;
    RAISE NOTICE '========================================';

    -- Check if fixed
    IF NOT rls_enabled AND policy_count = 0 AND anon_visible_count = user_count THEN
        RAISE NOTICE '✅ ✅ ✅ SUCCESS! ISSUE FIXED! ✅ ✅ ✅';
        RAISE NOTICE '';
        RAISE NOTICE 'Your app should now see all % users!', user_count;
        RAISE NOTICE 'Refresh your browser (F5) to see the changes.';
    ELSE
        RAISE WARNING '❌ Issue not fully resolved:';
        IF rls_enabled THEN
            RAISE WARNING '  - RLS is still enabled';
        END IF;
        IF policy_count > 0 THEN
            RAISE WARNING '  - % policies still exist', policy_count;
        END IF;
        IF anon_visible_count < user_count THEN
            RAISE WARNING '  - App can only see % out of % users', anon_visible_count, user_count;
        END IF;
    END IF;
END $$;

-- Step 6: Show sample users
DO $$
DECLARE
    r RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Sample Users (first 10):';
    RAISE NOTICE '----------------------------------------';

    FOR r IN
        SELECT user_id, email, user_type, first_name, last_name, is_active
        FROM public.users
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        counter := counter + 1;
        RAISE NOTICE '%: % % (%) - % - Active: %',
            counter,
            COALESCE(r.first_name, ''),
            COALESCE(r.last_name, ''),
            r.user_type,
            r.email,
            r.is_active;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Check the verification output above';
    RAISE NOTICE '2. If you see "SUCCESS", refresh your browser (F5)';
    RAISE NOTICE '3. Navigate to User Management page';
    RAISE NOTICE '4. You should now see all users!';
    RAISE NOTICE '========================================';
END $$;
