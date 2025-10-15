-- Verify Notification System is Working
-- Run this in Supabase SQL Editor

-- 1. Check if notification triggers exist
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notify%'
ORDER BY event_object_table, trigger_name;

-- 2. Check if notification functions exist
SELECT
    proname as function_name,
    prokind as kind
FROM pg_proc
WHERE proname LIKE '%notif%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- 3. Check recent notifications
SELECT
    n.notification_id,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at,
    u.email as recipient_email,
    u.first_name || ' ' || u.last_name as recipient_name
FROM notifications n
JOIN users u ON n.user_id = u.user_id
ORDER BY n.created_at DESC
LIMIT 10;

-- 4. Check notification preferences
SELECT
    np.user_id,
    u.email,
    u.first_name || ' ' || u.last_name as user_name,
    np.task_assigned,
    np.task_status_changed,
    np.issue_assigned
FROM notification_preferences np
JOIN users u ON np.user_id = u.user_id
ORDER BY u.email;

-- 5. Test notification creation manually
-- Replace the UUIDs with actual user IDs from your database
DO $$
DECLARE
    v_test_user_id UUID;
    v_notification_id UUID;
BEGIN
    -- Get first active user
    SELECT user_id INTO v_test_user_id
    FROM users
    WHERE is_active = true
    LIMIT 1;

    IF v_test_user_id IS NOT NULL THEN
        -- Create test notification (using valid 'mention' type)
        v_notification_id := create_notification(
            v_test_user_id,
            'mention',
            'Test Notification',
            'This is a test notification to verify the system is working',
            '/todos',
            NULL,
            NULL,
            NULL,
            jsonb_build_object('test', true)
        );

        RAISE NOTICE '✅ Test notification created with ID: %', v_notification_id;
        RAISE NOTICE '✅ User ID: %', v_test_user_id;
    ELSE
        RAISE NOTICE '❌ No active users found';
    END IF;
END $$;
