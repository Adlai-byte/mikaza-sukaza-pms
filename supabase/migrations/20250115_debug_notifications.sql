-- Debug script to verify notifications system
-- Run this in Supabase SQL Editor

-- ============================================
-- CHECK 1: Verify tables exist
-- ============================================
SELECT 'CHECKING TABLES...' as step;

SELECT table_name,
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND table_name IN ('notifications', 'notification_preferences');

-- ============================================
-- CHECK 2: Verify triggers exist
-- ============================================
SELECT 'CHECKING TRIGGERS...' as step;

SELECT trigger_name,
       event_object_table as table_name,
       action_statement,
       action_timing || ' ' || string_agg(event_manipulation, ', ') as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notify%'
GROUP BY trigger_name, event_object_table, action_statement, action_timing
ORDER BY event_object_table, trigger_name;

-- ============================================
-- CHECK 3: Verify functions exist
-- ============================================
SELECT 'CHECKING FUNCTIONS...' as step;

SELECT routine_name,
       routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%notif%'
ORDER BY routine_name;

-- ============================================
-- CHECK 4: Check existing notifications
-- ============================================
SELECT 'CHECKING EXISTING NOTIFICATIONS...' as step;

SELECT
    n.notification_id,
    n.type,
    n.title,
    n.is_read,
    u.first_name || ' ' || u.last_name as recipient,
    n.created_at
FROM public.notifications n
LEFT JOIN public.users u ON n.user_id = u.user_id
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================
-- CHECK 5: Test notification creation manually
-- ============================================
SELECT 'TESTING MANUAL NOTIFICATION CREATION...' as step;

-- Get a test user ID (first active user)
DO $$
DECLARE
    test_user_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get first active user
    SELECT user_id INTO test_user_id
    FROM public.users
    WHERE is_active = true
    LIMIT 1;

    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No active users found for testing';
        RETURN;
    END IF;

    -- Create a test notification
    SELECT create_notification(
        test_user_id,
        'task_assigned',
        'TEST NOTIFICATION',
        'This is a test notification created manually',
        '/todos',
        NULL,
        NULL,
        NULL,
        jsonb_build_object('test', true)
    ) INTO test_notification_id;

    RAISE NOTICE 'Test notification created with ID: %', test_notification_id;
    RAISE NOTICE 'Check notifications table for user_id: %', test_user_id;

    -- Show the created notification
    RAISE NOTICE 'Notification details:';
    PERFORM notification_id, title, message, created_at
    FROM public.notifications
    WHERE notification_id = test_notification_id;
END $$;

-- Verify test notification was created
SELECT 'VERIFYING TEST NOTIFICATION...' as step;

SELECT
    notification_id,
    type,
    title,
    message,
    created_at
FROM public.notifications
WHERE title = 'TEST NOTIFICATION'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- CHECK 6: Check task/issue tables for trigger compatibility
-- ============================================
SELECT 'CHECKING TASKS TABLE...' as step;

SELECT
    COUNT(*) as total_tasks,
    COUNT(DISTINCT created_by) as creators,
    COUNT(DISTINCT assigned_to) as assignees
FROM public.tasks;

SELECT 'CHECKING ISSUES TABLE...' as step;

SELECT
    COUNT(*) as total_issues,
    COUNT(DISTINCT reported_by) as reporters,
    COUNT(DISTINCT assigned_to) as assignees
FROM public.issues;

-- ============================================
-- CHECK 7: Grant permissions (run this if needed)
-- ============================================
SELECT 'CHECKING PERMISSIONS...' as step;

-- Show current permissions
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('notifications', 'notification_preferences')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 'SYSTEM CHECK COMPLETE' as step;

SELECT
    'If you see tables, triggers, and functions above, the system is ready!' as message
UNION ALL
SELECT
    'If no test notification was created, check function permissions' as message
UNION ALL
SELECT
    'Try creating a task and assigning it to see if automatic notifications work' as message;
