-- ============================================
-- JOBS & TASKS MANAGEMENT SYSTEM
-- Migration: Jobs System Tables
-- Created: 2025-01-12
-- ============================================

-- ============================================
-- 1. JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,

    -- Basic Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    job_type VARCHAR(50) NOT NULL DEFAULT 'general', -- general, maintenance, cleaning, inspection, check_in, check_out, repair, emergency

    -- Status & Priority
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, review, completed, cancelled
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- urgent, high, normal, low

    -- Assignment
    assigned_to UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,

    -- Scheduling
    due_date TIMESTAMP WITH TIME ZONE,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Time Tracking
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),

    -- Cost Tracking
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),

    -- Additional Fields
    location_notes TEXT, -- Specific location within property
    recurring_schedule VARCHAR(50), -- none, daily, weekly, biweekly, monthly
    parent_job_id UUID REFERENCES public.jobs(job_id) ON DELETE CASCADE, -- For recurring jobs

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    CONSTRAINT valid_job_type CHECK (job_type IN ('general', 'maintenance', 'cleaning', 'inspection', 'check_in', 'check_out', 'repair', 'emergency', 'preventive'))
);

-- Indexes for Jobs
CREATE INDEX idx_jobs_property_id ON public.jobs(property_id);
CREATE INDEX idx_jobs_assigned_to ON public.jobs(assigned_to);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_priority ON public.jobs(priority);
CREATE INDEX idx_jobs_due_date ON public.jobs(due_date);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX idx_jobs_job_type ON public.jobs(job_type);

-- ============================================
-- 2. JOB TASKS TABLE (Checklist Items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,

    -- Task Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_order INTEGER NOT NULL DEFAULT 0,

    -- Completion Status
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Job Tasks
CREATE INDEX idx_job_tasks_job_id ON public.job_tasks(job_id);
CREATE INDEX idx_job_tasks_is_completed ON public.job_tasks(is_completed);

-- ============================================
-- 3. JOB ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,

    -- File Information
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100), -- image/jpeg, application/pdf, etc.
    file_size BIGINT, -- Size in bytes

    -- Metadata
    caption TEXT,
    uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Job Attachments
CREATE INDEX idx_job_attachments_job_id ON public.job_attachments(job_id);
CREATE INDEX idx_job_attachments_uploaded_by ON public.job_attachments(uploaded_by);

-- ============================================
-- 4. JOB COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,

    -- Comment Information
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment', -- comment, status_change, assignment_change, note

    -- Metadata
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Job Comments
CREATE INDEX idx_job_comments_job_id ON public.job_comments(job_id);
CREATE INDEX idx_job_comments_user_id ON public.job_comments(user_id);
CREATE INDEX idx_job_comments_created_at ON public.job_comments(created_at DESC);

-- ============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Jobs updated_at trigger
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_updated_at();

-- Job Tasks updated_at trigger
CREATE OR REPLACE FUNCTION update_job_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_tasks_updated_at
    BEFORE UPDATE ON public.job_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_job_tasks_updated_at();

-- Job Comments updated_at trigger
CREATE OR REPLACE FUNCTION update_job_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_comments_updated_at
    BEFORE UPDATE ON public.job_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_job_comments_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

-- Jobs Policies
CREATE POLICY "Users can view jobs" ON public.jobs
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their assigned jobs or created jobs" ON public.jobs
    FOR UPDATE USING (
        auth.uid() = assigned_to OR
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

CREATE POLICY "Admins can delete jobs" ON public.jobs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- Job Tasks Policies
CREATE POLICY "Users can view job tasks" ON public.job_tasks
    FOR SELECT USING (true);

CREATE POLICY "Users can create job tasks" ON public.job_tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update job tasks" ON public.job_tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.job_id = job_tasks.job_id
            AND (jobs.assigned_to = auth.uid() OR jobs.created_by = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

CREATE POLICY "Users can delete job tasks" ON public.job_tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.job_id = job_tasks.job_id
            AND (jobs.assigned_to = auth.uid() OR jobs.created_by = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- Job Attachments Policies
CREATE POLICY "Users can view job attachments" ON public.job_attachments
    FOR SELECT USING (true);

CREATE POLICY "Users can upload job attachments" ON public.job_attachments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own attachments" ON public.job_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- Job Comments Policies
CREATE POLICY "Users can view job comments" ON public.job_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create job comments" ON public.job_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" ON public.job_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.job_comments
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- ============================================
-- 7. FUNCTIONS
-- ============================================

-- Function to automatically set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_job_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;

    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_completion
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION set_job_completed_at();

-- Function to auto-set task completion timestamp
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
        NEW.completed_at = NOW();
        NEW.completed_by = auth.uid();
    ELSIF NEW.is_completed = FALSE THEN
        NEW.completed_at = NULL;
        NEW.completed_by = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_completion
    BEFORE UPDATE ON public.job_tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_completed_at();

-- ============================================
-- 8. SAMPLE DATA (Optional - for development)
-- ============================================

-- Note: Uncomment below to insert sample data
/*
INSERT INTO public.jobs (property_id, title, description, job_type, status, priority, assigned_to, due_date)
SELECT
    p.property_id,
    'Sample Job - ' || COALESCE(p.property_name, 'Property ' || p.property_id),
    'This is a sample job for testing purposes',
    'maintenance',
    'pending',
    'high',
    u.user_id,
    NOW() + INTERVAL '7 days'
FROM public.properties p
CROSS JOIN (SELECT user_id FROM public.users LIMIT 1) u
WHERE p.property_name IS NOT NULL
LIMIT 5;
*/
