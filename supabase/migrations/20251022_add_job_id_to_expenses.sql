-- Add job_id column to expenses table for job-expense linking
-- This enables tracking expenses directly from job completion

-- Add job_id column
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(job_id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_job_id ON public.expenses(job_id);

-- Add comment
COMMENT ON COLUMN public.expenses.job_id IS 'Optional link to job that generated this expense';
