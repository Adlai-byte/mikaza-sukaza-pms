-- Add photo field to users table
ALTER TABLE public.users ADD COLUMN photo_url TEXT;

-- Create activity logs table for tracking user actions
CREATE TABLE public.activity_logs (
    log_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_details JSONB,
    performed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs table
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations on activity_logs for now (can be restricted later)
CREATE POLICY "Allow all operations on activity_logs"
ON public.activity_logs
FOR ALL
TO authenticated
USING (true);