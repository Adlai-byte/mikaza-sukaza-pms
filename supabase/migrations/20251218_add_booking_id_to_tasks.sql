-- Add booking_id to tasks table for linking tasks to bookings
-- This enables automatic job generation during booking creation

-- Add booking_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.property_bookings(booking_id) ON DELETE SET NULL;

-- Create index for efficient querying of tasks by booking
CREATE INDEX IF NOT EXISTS idx_tasks_booking_id ON public.tasks(booking_id);

-- Add comment to explain the relationship
COMMENT ON COLUMN public.tasks.booking_id IS 'Links task to the booking it was created for. Enables automatic job generation during booking creation.';
