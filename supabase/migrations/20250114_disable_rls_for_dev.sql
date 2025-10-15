-- Temporarily disable RLS for development when using session-based authentication
-- WARNING: This should ONLY be used in development. Enable RLS for production!

-- Disable RLS on tasks tables
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on issues tables
ALTER TABLE public.issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_photos DISABLE ROW LEVEL SECURITY;

-- Grant full access to anon role (for development only)
GRANT ALL ON public.tasks TO anon;
GRANT ALL ON public.task_checklists TO anon;
GRANT ALL ON public.task_comments TO anon;
GRANT ALL ON public.task_attachments TO anon;
GRANT ALL ON public.issues TO anon;
GRANT ALL ON public.issue_photos TO anon;

-- Storage policies remain unchanged since they're separate
-- Note: You may need to adjust storage policies as well if photo uploads fail
