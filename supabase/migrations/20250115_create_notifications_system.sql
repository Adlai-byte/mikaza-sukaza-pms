-- Create comprehensive notifications system
-- Supports task assignments, issue assignments, status changes, due dates, etc.

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'task_assigned',
        'task_status_changed',
        'task_completed',
        'task_due_soon',
        'task_overdue',
        'task_comment',
        'issue_assigned',
        'issue_status_changed',
        'issue_resolved',
        'issue_comment',
        'mention'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- URL to navigate to (e.g., /todos, /issues/:id)

    -- Related entities
    task_id UUID REFERENCES public.tasks(task_id) ON DELETE CASCADE,
    issue_id UUID REFERENCES public.issues(issue_id) ON DELETE CASCADE,

    -- Metadata
    action_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    metadata JSONB, -- Additional data (old_status, new_status, etc.)

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_issue_id ON public.notifications(issue_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,

    -- Email notifications
    email_task_assigned BOOLEAN DEFAULT TRUE,
    email_task_due_soon BOOLEAN DEFAULT TRUE,
    email_task_completed BOOLEAN DEFAULT FALSE,
    email_issue_assigned BOOLEAN DEFAULT TRUE,
    email_issue_resolved BOOLEAN DEFAULT FALSE,
    email_mentions BOOLEAN DEFAULT TRUE,

    -- In-app notifications
    app_task_assigned BOOLEAN DEFAULT TRUE,
    app_task_status_changed BOOLEAN DEFAULT TRUE,
    app_task_due_soon BOOLEAN DEFAULT TRUE,
    app_issue_assigned BOOLEAN DEFAULT TRUE,
    app_issue_status_changed BOOLEAN DEFAULT TRUE,
    app_mentions BOOLEAN DEFAULT TRUE,

    -- Browser notifications
    browser_enabled BOOLEAN DEFAULT FALSE,

    -- Settings
    daily_summary BOOLEAN DEFAULT FALSE,
    weekly_summary BOOLEAN DEFAULT FALSE,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS FOR NOTIFICATIONS
-- ============================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_task_id UUID DEFAULT NULL,
    p_issue_id UUID DEFAULT NULL,
    p_action_by UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_prefs RECORD;
BEGIN
    -- Check if user has this notification type enabled
    SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;

    -- If preferences don't exist, create default preferences
    IF NOT FOUND THEN
        INSERT INTO public.notification_preferences (user_id) VALUES (p_user_id);
    END IF;

    -- Insert notification
    INSERT INTO public.notifications (
        user_id, type, title, message, link,
        task_id, issue_id, action_by, metadata
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_link,
        p_task_id, p_issue_id, p_action_by, p_metadata
    ) RETURNING notification_id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE notification_id = p_notification_id AND user_id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = FALSE;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- ============================================

-- Trigger function for task assignment
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_creator RECORD;
    v_assignee RECORD;
BEGIN
    -- Only notify if task is newly assigned or assignee changed
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN

        -- Get creator info
        SELECT * INTO v_creator FROM public.users WHERE user_id = NEW.created_by;

        -- Get assignee info
        SELECT * INTO v_assignee FROM public.users WHERE user_id = NEW.assigned_to;

        -- Don't notify if user assigned task to themselves
        IF NEW.assigned_to != NEW.created_by THEN
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
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for task status change
CREATE OR REPLACE FUNCTION notify_task_status_changed()
RETURNS TRIGGER AS $$
DECLARE
    v_creator RECORD;
    v_changer RECORD;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Get task creator info
        SELECT * INTO v_creator FROM public.users WHERE user_id = NEW.created_by;

        -- Notify creator if someone else changed the status
        IF NEW.created_by != COALESCE((current_setting('request.jwt.claims', true)::json->>'sub')::uuid, NEW.created_by) THEN
            PERFORM create_notification(
                NEW.created_by,
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
                (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
            );
        END IF;

        -- If task completed, notify assignee
        IF NEW.status = 'completed' AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
            PERFORM create_notification(
                NEW.assigned_to,
                'task_completed',
                'Task Marked Complete',
                format('Task "%s" has been marked as complete', NEW.title),
                '/todos',
                NEW.task_id,
                NULL,
                NEW.created_by,
                jsonb_build_object('status', NEW.status)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for issue assignment
CREATE OR REPLACE FUNCTION notify_issue_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_reporter RECORD;
    v_assignee RECORD;
BEGIN
    -- Only notify if issue is newly assigned or assignee changed
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN

        -- Get reporter info
        SELECT * INTO v_reporter FROM public.users WHERE user_id = NEW.reported_by;

        -- Get assignee info
        SELECT * INTO v_assignee FROM public.users WHERE user_id = NEW.assigned_to;

        -- Don't notify if user assigned issue to themselves
        IF NEW.assigned_to != NEW.reported_by THEN
            PERFORM create_notification(
                NEW.assigned_to,
                'issue_assigned',
                'New Issue Assigned',
                format('%s assigned you an issue: %s',
                    COALESCE(v_reporter.first_name || ' ' || v_reporter.last_name, v_reporter.email),
                    NEW.title
                ),
                '/issues',
                NULL,
                NEW.issue_id,
                NEW.reported_by,
                jsonb_build_object('priority', NEW.priority, 'category', NEW.category)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for issue status change
CREATE OR REPLACE FUNCTION notify_issue_status_changed()
RETURNS TRIGGER AS $$
DECLARE
    v_reporter RECORD;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Get issue reporter info
        SELECT * INTO v_reporter FROM public.users WHERE user_id = NEW.reported_by;

        -- Notify reporter if issue status changed and it's not the reporter who changed it
        IF NEW.reported_by != COALESCE((current_setting('request.jwt.claims', true)::json->>'sub')::uuid, NEW.reported_by) THEN
            PERFORM create_notification(
                NEW.reported_by,
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
                (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
            );
        END IF;

        -- If issue resolved, notify assignee
        IF NEW.status = 'resolved' AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.reported_by THEN
            PERFORM create_notification(
                NEW.assigned_to,
                'issue_resolved',
                'Issue Marked Resolved',
                format('Issue "%s" has been marked as resolved', NEW.title),
                '/issues',
                NULL,
                NEW.issue_id,
                NEW.reported_by,
                jsonb_build_object('status', NEW.status)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
CREATE TRIGGER trigger_notify_task_assigned
    AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_assigned();

DROP TRIGGER IF EXISTS trigger_notify_task_status_changed ON public.tasks;
CREATE TRIGGER trigger_notify_task_status_changed
    AFTER UPDATE OF status ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_status_changed();

DROP TRIGGER IF EXISTS trigger_notify_issue_assigned ON public.issues;
CREATE TRIGGER trigger_notify_issue_assigned
    AFTER INSERT OR UPDATE OF assigned_to ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION notify_issue_assigned();

DROP TRIGGER IF EXISTS trigger_notify_issue_status_changed ON public.issues;
CREATE TRIGGER trigger_notify_issue_status_changed
    AFTER UPDATE OF status ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION notify_issue_status_changed();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS (or disable if using session auth)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- For session-based auth (AUTH_ENABLED = false), disable RLS
-- ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notification_preferences DISABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (TRUE); -- Temporarily allow all for testing with session auth

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (TRUE);

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (TRUE);

-- RLS Policies for preferences
CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can manage their own preferences"
    ON public.notification_preferences FOR ALL
    USING (TRUE);

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated, anon;
GRANT ALL ON public.notification_preferences TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated, anon;

-- ============================================
-- CLEANUP OLD NOTIFICATIONS (Optional)
-- ============================================

-- Function to delete old read notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE is_read = TRUE
      AND read_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Set up a cron job or scheduled task to run cleanup_old_notifications() periodically
