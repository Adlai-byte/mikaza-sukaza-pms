-- Complete Notification System Fix and Test
-- Run this in Supabase SQL Editor to fix and verify notifications

-- ============================================
-- STEP 1: Verify Tables Exist
-- ============================================
DO $$
BEGIN
    -- Check notifications table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '✅ notifications table exists';
    ELSE
        RAISE EXCEPTION '❌ notifications table does not exist';
    END IF;

    -- Check notification_preferences table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        RAISE NOTICE '✅ notification_preferences table exists';
    ELSE
        RAISE EXCEPTION '❌ notification_preferences table does not exist';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create Missing Notification Preferences
-- ============================================
INSERT INTO notification_preferences (user_id)
SELECT u.user_id
FROM users u
WHERE u.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM notification_preferences np
    WHERE np.user_id = u.user_id
  );

SELECT COUNT(*) as notification_prefs_created FROM notification_preferences;

-- ============================================
-- STEP 3: Check Triggers
-- ============================================
SELECT
    trigger_name,
    event_object_table as table_name,
    action_timing || ' ' || string_agg(event_manipulation, ', ') as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notify%'
GROUP BY trigger_name, event_object_table, action_timing
ORDER BY event_object_table, trigger_name;

-- ============================================
-- STEP 4: Test Create Notification Function
-- ============================================
DO $$
DECLARE
    v_test_user_id UUID;
    v_second_user_id UUID;
    v_notification_id UUID;
BEGIN
    -- Get two test users
    SELECT user_id INTO v_test_user_id
    FROM users
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;

    SELECT user_id INTO v_second_user_id
    FROM users
    WHERE is_active = true
      AND user_id != v_test_user_id
    ORDER BY created_at
    LIMIT 1 OFFSET 1;

    IF v_test_user_id IS NULL THEN
        RAISE EXCEPTION '❌ No test user found';
    END IF;

    -- Create test notification (using valid 'mention' type)
    v_notification_id := create_notification(
        v_test_user_id,
        'mention',
        'Manual Test Notification',
        'This notification was created by the fix_notifications.sql script',
        '/todos',
        NULL,
        NULL,
        v_second_user_id,
        jsonb_build_object('test', true, 'timestamp', now())
    );

    RAISE NOTICE '✅ Test notification created successfully!';
    RAISE NOTICE '   Notification ID: %', v_notification_id;
    RAISE NOTICE '   User ID: %', v_test_user_id;
END $$;

-- ============================================
-- STEP 5: Test Task Assignment Trigger
-- ============================================
DO $$
DECLARE
    v_admin_id UUID;
    v_ops_id UUID;
    v_property_id UUID;
    v_task_id UUID;
    v_notifications_count INTEGER;
BEGIN
    -- Get admin user
    SELECT user_id INTO v_admin_id
    FROM users
    WHERE user_type = 'admin' AND is_active = true
    LIMIT 1;

    -- Get ops user
    SELECT user_id INTO v_ops_id
    FROM users
    WHERE user_type = 'ops' AND is_active = true
    LIMIT 1;

    -- Get a property
    SELECT property_id INTO v_property_id
    FROM properties
    LIMIT 1;

    IF v_admin_id IS NULL OR v_ops_id IS NULL THEN
        RAISE NOTICE '⚠️  Need both admin and ops users to test. Skipping task assignment test.';
        RETURN;
    END IF;

    -- Count notifications before
    SELECT COUNT(*) INTO v_notifications_count
    FROM notifications
    WHERE user_id = v_ops_id
      AND type = 'task_assigned';

    RAISE NOTICE 'Notifications before task assignment: %', v_notifications_count;

    -- Create a test task assigned to ops user
    INSERT INTO tasks (
        title,
        description,
        status,
        priority,
        category,
        assigned_to,
        created_by,
        property_id,
        due_date
    ) VALUES (
        '[TEST] Notification Test Task',
        'This task was created to test the notification system. You can delete this.',
        'pending',
        'medium',
        'other',
        v_ops_id,  -- Assign to ops
        v_admin_id, -- Created by admin
        v_property_id,
        (NOW() + INTERVAL '1 day')::DATE
    ) RETURNING task_id INTO v_task_id;

    -- Wait a moment for trigger to fire
    PERFORM pg_sleep(0.5);

    -- Count notifications after
    SELECT COUNT(*) INTO v_notifications_count
    FROM notifications
    WHERE user_id = v_ops_id
      AND type = 'task_assigned'
      AND task_id = v_task_id;

    IF v_notifications_count > 0 THEN
        RAISE NOTICE '✅ Task assignment notification created successfully!';
        RAISE NOTICE '   Task ID: %', v_task_id;
        RAISE NOTICE '   Assigned to: %', v_ops_id;
        RAISE NOTICE '   Created by: %', v_admin_id;
    ELSE
        RAISE WARNING '❌ Task assignment notification was NOT created!';
        RAISE WARNING '   Task ID: %', v_task_id;
        RAISE WARNING '   Check trigger: trigger_notify_task_assigned';
    END IF;
END $$;

-- ============================================
-- STEP 6: Show Recent Notifications
-- ============================================
SELECT
    n.notification_id,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at,
    u.email as recipient_email,
    u.first_name || ' ' || u.last_name as recipient_name,
    t.title as task_title
FROM notifications n
JOIN users u ON n.user_id = u.user_id
LEFT JOIN tasks t ON n.task_id = t.task_id
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 7: Summary
-- ============================================
DO $$
DECLARE
    v_total_notifications INTEGER;
    v_unread_notifications INTEGER;
    v_active_users INTEGER;
    v_users_with_prefs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_notifications FROM notifications;
    SELECT COUNT(*) INTO v_unread_notifications FROM notifications WHERE is_read = false;
    SELECT COUNT(*) INTO v_active_users FROM users WHERE is_active = true;
    SELECT COUNT(*) INTO v_users_with_prefs FROM notification_preferences;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NOTIFICATION SYSTEM SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Notifications: %', v_total_notifications;
    RAISE NOTICE 'Unread Notifications: %', v_unread_notifications;
    RAISE NOTICE 'Active Users: %', v_active_users;
    RAISE NOTICE 'Users with Preferences: %', v_users_with_prefs;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    IF v_total_notifications = 0 THEN
        RAISE WARNING '⚠️  No notifications in database. Triggers may not be working.';
    ELSE
        RAISE NOTICE '✅ Notifications appear to be working!';
    END IF;
END $$;
