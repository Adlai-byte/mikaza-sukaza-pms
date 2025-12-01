-- =====================================================
-- NUCLEAR OPTION: Automatically disable RLS on ALL tables
-- =====================================================
-- This finds EVERY table with RLS and disables it

-- Step 1: Show all tables with RLS currently enabled
SELECT
  '🔍 Tables with RLS enabled (will be fixed):' as info,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- Step 2: Automatically disable RLS on ALL public tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    LOOP
        -- Disable RLS
        EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', r.tablename);

        -- Grant full access
        EXECUTE format('GRANT ALL ON public.%I TO authenticated', r.tablename);
        EXECUTE format('GRANT ALL ON public.%I TO anon', r.tablename);

        RAISE NOTICE 'Disabled RLS on: %', r.tablename;
    END LOOP;
END $$;

-- Step 3: Verify NO tables have RLS enabled
SELECT
  '✅ Verification - Tables with RLS STILL enabled:' as info,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ NONE - All tables accessible!'
    ELSE '❌ Some tables still have RLS'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- Step 4: Show total tables processed
SELECT
  '📊 Summary:' as info,
  COUNT(*) as total_tables_in_database,
  '✅ All have RLS disabled' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ RLS DISABLED ON ALL TABLES';
  RAISE NOTICE '✅ FULL ACCESS GRANTED';
  RAISE NOTICE '🔄 REFRESH BROWSER NOW';
  RAISE NOTICE '======================================';
END $$;
