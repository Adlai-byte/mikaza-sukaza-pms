# Notification System Troubleshooting Guide

## Issue: Notifications not appearing when tasks/issues are assigned

### Quick Fix Steps

#### 1. Run the Debug Script

**Go to Supabase Dashboard → SQL Editor and run:**
```
supabase/migrations/20250115_debug_notifications.sql
```

This will:
- ✅ Verify tables and triggers exist
- ✅ Check if functions are created
- ✅ Show existing notifications
- ✅ Create a test notification manually
- ✅ Display permissions

#### 2. Check Trigger Status

Run this query to verify triggers are active:

```sql
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('tasks', 'issues')
  AND trigger_name LIKE '%notify%';
```

**Expected Results:**
- ✅ `trigger_notify_task_assigned` on `tasks` table
- ✅ `trigger_notify_task_status_changed` on `tasks` table
- ✅ `trigger_notify_issue_assigned` on `issues` table
- ✅ `trigger_notify_issue_status_changed` on `issues` table

If any are missing, re-run the main migration.

#### 3. Test Manual Notification Creation

```sql
-- Get your user ID first
SELECT user_id, first_name, last_name, email
FROM public.users
WHERE is_active = true
LIMIT 5;

-- Create a test notification (replace YOUR_USER_ID with actual ID)
SELECT create_notification(
    'YOUR_USER_ID'::uuid,  -- Replace with actual user_id
    'task_assigned',
    'Test Notification',
    'This is a manual test notification',
    '/todos',
    NULL,
    NULL,
    NULL,
    NULL
);

-- Check if it was created
SELECT * FROM public.notifications
WHERE title = 'Test Notification'
ORDER BY created_at DESC;
```

**If this works:** Triggers are the problem
**If this fails:** Permissions or function issues

#### 4. Enable Trigger Logging

To see what's happening when tasks are created, add logging:

```sql
-- Temporary logging version of task assignment trigger
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_creator RECORD;
    v_assignee RECORD;
BEGIN
    RAISE NOTICE 'TRIGGER FIRED: notify_task_assigned, Operation: %, Task ID: %', TG_OP, NEW.task_id;
    RAISE NOTICE 'assigned_to: %, created_by: %', NEW.assigned_to, NEW.created_by;

    -- Only notify if task is newly assigned or assignee changed
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN

        RAISE NOTICE 'Condition met, creating notification...';

        -- Get creator info
        SELECT * INTO v_creator FROM public.users WHERE user_id = NEW.created_by;
        RAISE NOTICE 'Creator: % %', v_creator.first_name, v_creator.last_name;

        -- Get assignee info
        SELECT * INTO v_assignee FROM public.users WHERE user_id = NEW.assigned_to;
        RAISE NOTICE 'Assignee: % %', v_assignee.first_name, v_assignee.last_name;

        -- Don't notify if user assigned task to themselves
        IF NEW.assigned_to != NEW.created_by THEN
            RAISE NOTICE 'Users are different, calling create_notification...';

            PERFORM create_notification(
                NEW.assigned_to,
                'task_assigned',
                'New Task Assigned',
                format('%s assigned you a task: %s',
                    COALESCE(v_creator.first_name || ' ' || v_creator.last_name, v_creator.email),
                    NEW.title
                ),
                '/todos',
                NEW.task_id,
                NULL,
                NEW.created_by,
                jsonb_build_object('priority', NEW.priority, 'due_date', NEW.due_date)
            );

            RAISE NOTICE 'Notification created successfully!';
        ELSE
            RAISE NOTICE 'Skipping notification - user assigned to self';
        END IF;
    ELSE
        RAISE NOTICE 'Condition not met, skipping notification';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Now when you create a task, check **Supabase Dashboard → Logs** to see the RAISE NOTICE messages.

#### 5. Common Issues and Solutions

**Issue: "Permission denied for function create_notification"**
```sql
GRANT EXECUTE ON FUNCTION create_notification TO anon, authenticated;
GRANT ALL ON public.notifications TO anon, authenticated;
```

**Issue: "relation notifications does not exist"**
- Tables weren't created
- Run the main migration: `20250115_create_notifications_system.sql`

**Issue: Triggers not firing**
```sql
-- Check if triggers are enabled
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname LIKE '%notify%';

-- 'O' means enabled, 'D' means disabled
-- If disabled, enable them:
ALTER TABLE public.tasks ENABLE TRIGGER trigger_notify_task_assigned;
ALTER TABLE public.tasks ENABLE TRIGGER trigger_notify_task_status_changed;
ALTER TABLE public.issues ENABLE TRIGGER trigger_notify_issue_assigned;
ALTER TABLE public.issues ENABLE TRIGGER trigger_notify_issue_status_changed;
```

**Issue: No errors but no notifications appear**
- Check browser console for real-time subscription logs
- Verify `useNotifications` hook is being called
- Check notification bell component is mounted
- Verify user_id is available in AuthContext

#### 6. Test from Application

**Browser Console Test:**
1. Open DevTools (F12) → Console
2. Create a task and assign it to another user
3. Look for:
   - ✅ `🔔 Notification update:` log (if real-time works)
   - ❌ Any errors about permissions or queries

**Manual Query Test (in browser):**
```javascript
// Open browser console on your app
// Get Supabase client from window
const { supabase } = await import('/src/integrations/supabase/client');

// Check notifications
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('Notifications:', data);
console.log('Error:', error);
```

#### 7. Verify Real-Time Subscription

```sql
-- Check if Realtime is enabled on notifications table
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notifications';

-- Enable Realtime if needed (do this in Supabase Dashboard → Database → Replication)
```

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Find `notifications` table
3. Enable replication
4. Click **Save**

#### 8. Nuclear Option: Reset and Recreate

If nothing works, reset the notifications system:

```sql
-- WARNING: This deletes all notifications!
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
DROP TRIGGER IF EXISTS trigger_notify_task_status_changed ON public.tasks;
DROP TRIGGER IF EXISTS trigger_notify_issue_assigned ON public.issues;
DROP TRIGGER IF EXISTS trigger_notify_issue_status_changed ON public.issues;

DROP FUNCTION IF EXISTS notify_task_assigned();
DROP FUNCTION IF EXISTS notify_task_status_changed();
DROP FUNCTION IF EXISTS notify_issue_assigned();
DROP FUNCTION IF EXISTS notify_issue_status_changed();
DROP FUNCTION IF EXISTS create_notification;
DROP FUNCTION IF EXISTS mark_notification_read;
DROP FUNCTION IF EXISTS mark_all_notifications_read;
DROP FUNCTION IF EXISTS cleanup_old_notifications;

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- Then re-run:
-- 1. supabase/migrations/20250115_create_notifications_system.sql
-- 2. supabase/migrations/20250115_fix_notifications_migration.sql
```

---

## Expected Behavior

When working correctly:

1. **Create Task → Assign to User B (while logged in as User A)**
   - Trigger `trigger_notify_task_assigned` fires
   - Function `notify_task_assigned()` runs
   - Creates notification with type `task_assigned`
   - User B's `notifications` table gets new row
   - Real-time subscription in `useNotifications` detects change
   - React Query invalidates cache
   - Bell badge updates to show unread count
   - Browser notification appears (if permission granted)

2. **Change Task Status**
   - Trigger `trigger_notify_task_status_changed` fires
   - Function `notify_task_status_changed()` runs
   - Task creator gets notified
   - Same real-time flow as above

---

## Contact Points for Debugging

1. **Database Logs** - Supabase Dashboard → Logs → Look for trigger RAISE NOTICE
2. **Browser Console** - Look for `🔔 Notification update:` or errors
3. **Network Tab** - Check if notification queries are returning data
4. **React Query Devtools** - Check `['notifications', 'list']` and `['notifications', 'count']` queries

If you've tried all these steps and notifications still don't work, please provide:
- Results from the debug script
- Browser console logs
- Any error messages from Supabase logs
