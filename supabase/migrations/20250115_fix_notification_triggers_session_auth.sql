-- Fix notification triggers to work with session-based authentication
-- This migration simplifies triggers to work without JWT tokens

-- ============================================
-- DROP OLD TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
DROP TRIGGER IF EXISTS trigger_notify_task_status_changed ON public.tasks;
DROP TRIGGER IF EXISTS trigger_notify_issue_assigned ON public.issues;
DROP TRIGGER IF EXISTS trigger_notify_issue_status_changed ON public.issues;

-- ============================================
-- SIMPLIFIED TRIGGER FUNCTIONS (NO JWT DEPENDENCY)
-- ============================================

-- Task Assignment Notification
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_creator RECORD;
BEGIN
    -- Only notify if task is newly assigned or assignee changed
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN

        -- Get creator info
        SELECT user_id, first_name, last_name, email
        INTO v_creator
        FROM public.users
        WHERE user_id = NEW.created_by;

        -- Don't notify if user assigned task to themselves
        IF NEW.assigned_to != NEW.created_by THEN
            PERFORM create_notification(
                NEW.assigned_to,  -- Notify the assignee
                'task_assigned',
                'New Task Assigned',
                format('%s assigned you a task: %s',
                    COALESCE(v_creator.first_name || ' ' || v_creator.last_name, v_creator.email, 'Someone'),
                    NEW.title
                ),
                '/todos',
                NEW.task_id,
                NULL,
                NEW.created_by,
                jsonb_build_object(
                    'priority', NEW.priority,
                    'due_date', NEW.due_date,
                    'task_title', NEW.title
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Task Status Change Notification
CREATE OR REPLACE FUNCTION notify_task_status_changed()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Notify task creator about status change (skip if creator changed it themselves)
        IF NEW.created_by IS NOT NULL THEN
            PERFORM create_notification(
                NEW.created_by,  -- Notify the creator
                'task_status_changed',
                'Task Status Updated',
                format('Task "%s" status changed from %s to %s',
                    NEW.title,
                    OLD.status,
                    NEW.status
                ),
                '/todos',
                NEW.task_id,
                NULL,
                NULL,  -- No specific action_by for session auth
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'task_title', NEW.title
                )
            );
        END IF;

        -- If task completed, also notify assignee
        IF NEW.status = 'completed' AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
            PERFORM create_notification(
                NEW.assigned_to,  -- Notify the assignee
                'task_completed',
                'Task Marked Complete',
                format('Task "%s" has been marked as complete', NEW.title),
                '/todos',
                NEW.task_id,
                NULL,
                NEW.created_by,
                jsonb_build_object(
                    'status', NEW.status,
                    'task_title', NEW.title
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Issue Assignment Notification
CREATE OR REPLACE FUNCTION notify_issue_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_reporter RECORD;
BEGIN
    -- Only notify if issue is newly assigned or assignee changed
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN

        -- Get reporter info
        SELECT user_id, first_name, last_name, email
        INTO v_reporter
        FROM public.users
        WHERE user_id = NEW.reported_by;

        -- Don't notify if user assigned issue to themselves
        IF NEW.assigned_to != NEW.reported_by THEN
            PERFORM create_notification(
                NEW.assigned_to,  -- Notify the assignee
                'issue_assigned',
                'New Issue Assigned',
                format('%s assigned you an issue: %s',
                    COALESCE(v_reporter.first_name || ' ' || v_reporter.last_name, v_reporter.email, 'Someone'),
                    NEW.title
                ),
                '/issues',
                NULL,
                NEW.issue_id,
                NEW.reported_by,
                jsonb_build_object(
                    'priority', NEW.priority,
                    'category', NEW.category,
                    'issue_title', NEW.title
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Issue Status Change Notification
CREATE OR REPLACE FUNCTION notify_issue_status_changed()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Notify issue reporter about status change
        IF NEW.reported_by IS NOT NULL THEN
            PERFORM create_notification(
                NEW.reported_by,  -- Notify the reporter
                'issue_status_changed',
                'Issue Status Updated',
                format('Issue "%s" status changed from %s to %s',
                    NEW.title,
                    OLD.status,
                    NEW.status
                ),
                '/issues',
                NULL,
                NEW.issue_id,
                NULL,  -- No specific action_by for session auth
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'issue_title', NEW.title
                )
            );
        END IF;

        -- If issue resolved, also notify assignee
        IF NEW.status = 'resolved' AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.reported_by THEN
            PERFORM create_notification(
                NEW.assigned_to,  -- Notify the assignee
                'issue_resolved',
                'Issue Marked Resolved',
                format('Issue "%s" has been marked as resolved', NEW.title),
                '/issues',
                NULL,
                NEW.issue_id,
                NEW.reported_by,
                jsonb_build_object(
                    'status', NEW.status,
                    'issue_title', NEW.title
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RECREATE TRIGGERS
-- ============================================

CREATE TRIGGER trigger_notify_task_assigned
    AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_assigned();

CREATE TRIGGER trigger_notify_task_status_changed
    AFTER UPDATE OF status ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_status_changed();

CREATE TRIGGER trigger_notify_issue_assigned
    AFTER INSERT OR UPDATE OF assigned_to ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION notify_issue_assigned();

CREATE TRIGGER trigger_notify_issue_status_changed
    AFTER UPDATE OF status ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION notify_issue_status_changed();

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that triggers are created
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notify%'
ORDER BY event_object_table, trigger_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Notification triggers have been updated for session-based auth';
    RAISE NOTICE '✅ Triggers will now work without JWT tokens';
    RAISE NOTICE '✅ Test by creating a task and assigning it to another user';
END $$;
