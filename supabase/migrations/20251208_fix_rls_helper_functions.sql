-- ============================================
-- FIX RLS HELPER FUNCTIONS
-- ============================================
-- The previous helper functions read user_type from JWT claims,
-- but Supabase doesn't automatically include custom fields in JWT.
-- This migration fixes the functions to read from the users table directly.

-- Drop existing helper functions (CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_ops() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_ops() CASCADE;

-- ============================================
-- NEW HELPER FUNCTIONS (read from database)
-- ============================================

-- Get current user's role from users table
-- Uses SECURITY DEFINER to bypass RLS when checking user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(user_type, '')
  FROM public.users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid() AND user_type = 'admin'
  );
$$;

-- Check if current user is ops
CREATE OR REPLACE FUNCTION public.is_ops()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid() AND user_type = 'ops'
  );
$$;

-- Check if current user is admin or ops
CREATE OR REPLACE FUNCTION public.is_admin_or_ops()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid() AND user_type IN ('admin', 'ops')
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ops() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_ops() TO authenticated;

-- ============================================
-- Ensure users table has proper self-access policy
-- ============================================

-- Drop and recreate the self-access policy to ensure it exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add comment
COMMENT ON FUNCTION public.get_user_role() IS 'Returns the user_type of the current authenticated user from the users table';
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current user is an admin';
COMMENT ON FUNCTION public.is_ops() IS 'Returns true if the current user is ops';
COMMENT ON FUNCTION public.is_admin_or_ops() IS 'Returns true if the current user is admin or ops';
