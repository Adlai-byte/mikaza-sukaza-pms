-- Add job_id to tasks table for linking tasks created from jobs
-- When a task from a job is completed, the job status will auto-update

-- Add job_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(job_id) ON DELETE SET NULL;

-- Create index for job_id
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON public.tasks(job_id);

-- Add comment to explain the relationship
COMMENT ON COLUMN public.tasks.job_id IS 'Links task to the job it was created from. When task is completed, job status may auto-update.';
