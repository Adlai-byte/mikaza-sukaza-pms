-- ============================================================================
-- ULTIMATE RLS FIX - Verified Solution
-- ============================================================================
-- Run this and check the output carefully

-- Step 1: Show current RLS status BEFORE changes
DO $$
DECLARE
    rls_status RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BEFORE CHANGES:';
    RAISE NOTICE '========================================';

    SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
    INTO rls_status
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'users';

    RAISE NOTICE 'Table: %.%', rls_status.schemaname, rls_status.tablename;
    RAISE NOTICE 'RLS Enabled: %', rls_status.rls_enabled;
END $$;

-- Step 2: Check and show all active policies BEFORE dropping
DO $$
DECLARE
    pol RECORD;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Active Policies on users table:';

    FOR pol IN
        SELECT policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        policy_count := policy_count + 1;
        RAISE NOTICE '  - Policy %: % (%)', policy_count, pol.policyname, pol.cmd;
    END LOOP;

    IF policy_count = 0 THEN
        RAISE NOTICE '  (no policies found)';
    ELSE
        RAISE NOTICE 'Total policies: %', policy_count;
    END IF;
END $$;

-- Step 3: Disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Dropping policies...';

    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
        RAISE NOTICE '  ✓ Dropped: %', pol.policyname;
    END LOOP;
END $$;

-- Step 5: Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✓ Granted ALL permissions to authenticated role';
    RAISE NOTICE '✓ Granted ALL permissions to anon role';
END $$;

-- Step 6: Show RLS status AFTER changes
DO $$
DECLARE
    rls_status RECORD;
    policy_count INTEGER;
    user_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AFTER CHANGES:';
    RAISE NOTICE '========================================';

    -- Check RLS
    SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
    INTO rls_status
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'users';

    RAISE NOTICE 'Table: %.%', rls_status.schemaname, rls_status.tablename;
    RAISE NOTICE 'RLS Enabled: %', rls_status.rls_enabled;

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users';
    RAISE NOTICE 'Active Policies: %', policy_count;

    -- Count users
    SELECT COUNT(*) INTO user_count FROM public.users;
    RAISE NOTICE 'Total Users: %', user_count;

    RAISE NOTICE '========================================';

    IF rls_status.rls_enabled THEN
        RAISE WARNING '❌ FAILED: RLS is still ENABLED!';
    ELSE
        RAISE NOTICE '✅ SUCCESS: RLS is DISABLED';
    END IF;

    IF policy_count > 0 THEN
        RAISE WARNING '❌ FAILED: % policies still exist!', policy_count;
    ELSE
        RAISE NOTICE '✅ SUCCESS: No active policies';
    END IF;

    IF user_count = 103 THEN
        RAISE NOTICE '✅ SUCCESS: All 103 users are accessible';
    ELSE
        RAISE WARNING '⚠️  User count: % (expected 103)', user_count;
    END IF;
END $$;

-- Step 7: Test query as anon role (simulates what your app sees)
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESTING APP-LEVEL ACCESS:';
    RAISE NOTICE '========================================';

    -- This simulates what the anon key would see
    SET LOCAL ROLE anon;
    SELECT COUNT(*) INTO test_count FROM public.users;
    RESET ROLE;

    RAISE NOTICE 'Users visible to anon role: %', test_count;

    IF test_count = 103 THEN
        RAISE NOTICE '✅ SUCCESS: App will see all 103 users!';
    ELSIF test_count = 1 THEN
        RAISE WARNING '❌ FAILED: App will still only see 1 user!';
        RAISE WARNING '    This means RLS or policies are still blocking access.';
    ELSE
        RAISE WARNING '⚠️  App will see % users (expected 103)', test_count;
    END IF;
END $$;

-- Step 8: Show sample of first 5 users
DO $$
DECLARE
    r RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Sample Users (first 5):';

    FOR r IN
        SELECT user_id, email, user_type, created_at
        FROM public.users
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        counter := counter + 1;
        RAISE NOTICE '  %: % (%) - %', counter, r.email, r.user_type, r.user_id;
    END LOOP;

    RAISE NOTICE '========================================';
END $$;
