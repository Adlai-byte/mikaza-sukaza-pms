-- Fix partial notifications migration by disabling RLS for session auth
-- Run this script in Supabase SQL Editor

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.notification_preferences;

-- Disable RLS for session-based auth (since AUTH_ENABLED = false)
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to anon role (used in session auth)
GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notification_preferences TO anon;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO anon;

-- Verify tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        RAISE NOTICE 'notifications table does not exist - run main migration first';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences') THEN
        RAISE NOTICE 'notification_preferences table does not exist - run main migration first';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Notifications system RLS has been disabled for session auth';
    RAISE NOTICE 'All permissions granted to anon role';
END $$;
