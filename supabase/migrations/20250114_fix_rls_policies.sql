-- Fix RLS policies for tasks and issues tables
-- This fixes the "new row violates row-level security policy" error

-- ============================================
-- FIX TASKS RLS POLICIES
-- ============================================

-- Drop existing INSERT policy for tasks
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;

-- Create new INSERT policy that allows authenticated users to create tasks
CREATE POLICY "Authenticated users can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- ============================================
-- FIX TASK_CHECKLISTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage checklists for their tasks" ON public.task_checklists;

-- Create separate policies for better control
CREATE POLICY "Users can insert checklist items"
    ON public.task_checklists FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update checklist items"
    ON public.task_checklists FOR UPDATE
    TO authenticated
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

CREATE POLICY "Users can delete checklist items"
    ON public.task_checklists FOR DELETE
    TO authenticated
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

-- ============================================
-- FIX ISSUES RLS POLICIES
-- ============================================

-- Drop existing INSERT policy for issues
DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.issues;

-- Create new INSERT policy that allows authenticated users to create issues
CREATE POLICY "Authenticated users can create issues"
    ON public.issues FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- ============================================
-- FIX ISSUE_PHOTOS RLS POLICIES
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can upload photos to issues they can access" ON public.issue_photos;

-- Create simpler INSERT policy
CREATE POLICY "Authenticated users can upload photos"
    ON public.issue_photos FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- ============================================
-- VERIFY AUTHENTICATED ROLE HAS ACCESS
-- ============================================

-- Ensure the authenticated role has necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.task_checklists TO authenticated;
GRANT ALL ON public.task_comments TO authenticated;
GRANT ALL ON public.task_attachments TO authenticated;
GRANT ALL ON public.issues TO authenticated;
GRANT ALL ON public.issue_photos TO authenticated;

-- Grant sequence permissions if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname LIKE '%tasks%') THEN
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    END IF;
END $$;
