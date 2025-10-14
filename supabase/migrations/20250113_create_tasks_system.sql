-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    property_id UUID REFERENCES public.properties(property_id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('cleaning', 'maintenance', 'check_in_prep', 'check_out_prep', 'inspection', 'repair', 'other')),
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_checklists table
CREATE TABLE IF NOT EXISTS public.task_checklists (
    checklist_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON public.tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON public.task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tasks table
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
-- Allow authenticated users to view tasks they created or are assigned to
CREATE POLICY "Users can view their own tasks"
    ON public.tasks FOR SELECT
    USING (
        auth.uid() = created_by OR
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- Allow authenticated users to create tasks
CREATE POLICY "Authenticated users can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update tasks they created or are assigned to (or admins)
CREATE POLICY "Users can update their own tasks"
    ON public.tasks FOR UPDATE
    USING (
        auth.uid() = created_by OR
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- Allow users to delete tasks they created (or admins)
CREATE POLICY "Users can delete their own tasks"
    ON public.tasks FOR DELETE
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- RLS policies for task_checklists
CREATE POLICY "Users can view checklists for their tasks"
    ON public.task_checklists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE task_id = task_checklists.task_id
            AND (
                tasks.created_by = auth.uid() OR
                tasks.assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND user_type = 'admin')
            )
        )
    );

CREATE POLICY "Users can manage checklists for their tasks"
    ON public.task_checklists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE task_id = task_checklists.task_id
            AND (
                tasks.created_by = auth.uid() OR
                tasks.assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND user_type = 'admin')
            )
        )
    );

-- RLS policies for task_comments
CREATE POLICY "Users can view comments for their tasks"
    ON public.task_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE task_id = task_comments.task_id
            AND (
                tasks.created_by = auth.uid() OR
                tasks.assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND user_type = 'admin')
            )
        )
    );

CREATE POLICY "Users can add comments to their tasks"
    ON public.task_comments FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE task_id = task_comments.task_id
            AND (
                tasks.created_by = auth.uid() OR
                tasks.assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND user_type = 'admin')
            )
        )
    );

CREATE POLICY "Users can delete their own comments"
    ON public.task_comments FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for task_attachments
CREATE POLICY "Users can view attachments for their tasks"
    ON public.task_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE task_id = task_attachments.task_id
            AND (
                tasks.created_by = auth.uid() OR
                tasks.assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND user_type = 'admin')
            )
        )
    );

CREATE POLICY "Users can add attachments to their tasks"
    ON public.task_attachments FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE task_id = task_attachments.task_id
            AND (
                tasks.created_by = auth.uid() OR
                tasks.assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND user_type = 'admin')
            )
        )
    );

CREATE POLICY "Users can delete their own attachments"
    ON public.task_attachments FOR DELETE
    USING (auth.uid() = uploaded_by);

-- Grant permissions
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.task_checklists TO authenticated;
GRANT ALL ON public.task_comments TO authenticated;
GRANT ALL ON public.task_attachments TO authenticated;
