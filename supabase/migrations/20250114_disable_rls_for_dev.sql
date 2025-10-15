-- Temporarily disable RLS for development when using session-based authentication
-- WARNING: This should ONLY be used in development. Enable RLS for production!

-- Disable RLS on user tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bank_accounts') THEN
        ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_cards') THEN
        ALTER TABLE public.credit_cards DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Disable RLS on property tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN
        ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'amenities') THEN
        ALTER TABLE public.amenities DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rules') THEN
        ALTER TABLE public.rules DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Disable RLS on booking/job tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
        ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
        ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Disable RLS on tasks tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
        ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_checklists') THEN
        ALTER TABLE public.task_checklists DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_comments') THEN
        ALTER TABLE public.task_comments DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_attachments') THEN
        ALTER TABLE public.task_attachments DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Disable RLS on issues tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'issues') THEN
        ALTER TABLE public.issues DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'issue_photos') THEN
        ALTER TABLE public.issue_photos DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Disable RLS on activity logs (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
        ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Grant full access to authenticated role (for existing tables only)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'users', 'profiles', 'bank_accounts', 'credit_cards',
            'properties', 'amenities', 'rules',
            'bookings', 'jobs',
            'tasks', 'task_checklists', 'task_comments', 'task_attachments',
            'issues', 'issue_photos',
            'activity_logs'
        )
    LOOP
        EXECUTE 'GRANT ALL ON public.' || r.tablename || ' TO authenticated';
    END LOOP;
END $$;

-- Grant SELECT to anon for public-readable tables (if they exist)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'profiles', 'properties', 'amenities', 'rules')
    LOOP
        EXECUTE 'GRANT SELECT ON public.' || r.tablename || ' TO anon';
    END LOOP;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'RLS disabled for all existing tables in development mode';
    RAISE NOTICE 'WARNING: This is for DEVELOPMENT ONLY. Enable RLS for production!';
END $$;

-- Storage policies remain unchanged since they're separate
-- Note: You may need to adjust storage policies as well if photo uploads fail
