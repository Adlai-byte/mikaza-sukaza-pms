-- Add job notifications support to notifications system
-- This migration adds job_id reference and job notification types

-- Add job_id column to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(job_id) ON DELETE CASCADE;

-- Create index for job_id
CREATE INDEX IF NOT EXISTS idx_notifications_job_id ON public.notifications(job_id);

-- Drop existing type constraint (try both possible names)
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Also try the constraint name from the original migration
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check1;

-- Add updated type constraint with job notification types
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
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
    'mention',
    'job_assigned',
    'job_status_changed',
    'job_completed',
    'job_comment',
    'booking_created',
    'booking_confirmed',
    'booking_cancelled'
));
