-- Migration: Add unit_id to issues and jobs tables
-- Date: 2026-01-11
-- Description: Allows issues and jobs to be associated with specific units within a property,
--              enabling more granular tracking for multi-unit properties.

-- ============================================
-- 1. ADD UNIT_ID TO ISSUES TABLE
-- ============================================
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.property_units(unit_id) ON DELETE SET NULL;

-- Create index for efficient unit-based queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_issues_unit_id') THEN
    CREATE INDEX idx_issues_unit_id ON public.issues(unit_id);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.issues.unit_id IS 'Optional reference to a specific unit within the property. NULL means the issue applies to the entire property or common areas.';

-- ============================================
-- 2. ADD UNIT_ID TO JOBS TABLE
-- ============================================
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.property_units(unit_id) ON DELETE SET NULL;

-- Create index for efficient unit-based queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_unit_id') THEN
    CREATE INDEX idx_jobs_unit_id ON public.jobs(unit_id);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.unit_id IS 'Optional reference to a specific unit within the property. NULL means the job applies to the entire property or common areas.';
