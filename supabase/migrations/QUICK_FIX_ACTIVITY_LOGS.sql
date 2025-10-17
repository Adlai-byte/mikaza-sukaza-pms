-- Quick Fix: Activity Logs Access
-- Run this in Supabase SQL Editor if activity logs are failing

-- Drop the old RLS policy that restricts to authenticated users only
DROP POLICY IF EXISTS "Allow all operations on activity_logs" ON public.activity_logs;

-- Disable RLS completely
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;

-- Grant full access to all roles
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO anon;

-- Verify the fix
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'activity_logs';

-- Should return: rls_enabled = false
