-- Create issues table
CREATE TABLE IF NOT EXISTS public.issues (
    issue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(property_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('maintenance', 'damage', 'repair_needed', 'cleaning', 'plumbing', 'electrical', 'appliance', 'hvac', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'on_hold')),
    reported_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    location TEXT,
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create issue_photos table
CREATE TABLE IF NOT EXISTS public.issue_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(issue_id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT NOT NULL DEFAULT 'before' CHECK (photo_type IN ('before', 'after', 'progress', 'other')),
    caption TEXT,
    uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_issues_property_id ON public.issues(property_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON public.issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_category ON public.issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_reported_by ON public.issues(reported_by);
CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON public.issues(assigned_to);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON public.issues(created_at);
CREATE INDEX IF NOT EXISTS idx_issue_photos_issue_id ON public.issue_photos(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_photos_photo_type ON public.issue_photos(photo_type);

-- Create trigger for issues updated_at
CREATE TRIGGER update_issues_updated_at
    BEFORE UPDATE ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for issues
-- Allow authenticated users to view all issues for properties they have access to
CREATE POLICY "Users can view issues"
    ON public.issues FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            -- Users can see issues they reported
            reported_by = auth.uid() OR
            -- Users can see issues assigned to them
            assigned_to = auth.uid() OR
            -- Admins can see all issues
            EXISTS (
                SELECT 1 FROM public.users
                WHERE user_id = auth.uid() AND user_type = 'admin'
            ) OR
            -- Ops users can see all issues
            EXISTS (
                SELECT 1 FROM public.users
                WHERE user_id = auth.uid() AND user_type = 'ops'
            )
        )
    );

-- Allow authenticated users to create issues
CREATE POLICY "Authenticated users can create issues"
    ON public.issues FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update issues they reported or are assigned to (or admins)
CREATE POLICY "Users can update their issues"
    ON public.issues FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            reported_by = auth.uid() OR
            assigned_to = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.users
                WHERE user_id = auth.uid() AND user_type = 'admin'
            )
        )
    );

-- Allow admins to delete issues
CREATE POLICY "Admins can delete issues"
    ON public.issues FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- RLS policies for issue_photos
CREATE POLICY "Users can view photos for issues they can see"
    ON public.issue_photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.issues
            WHERE issue_id = issue_photos.issue_id
            AND (
                issues.reported_by = auth.uid() OR
                issues.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE user_id = auth.uid() AND (user_type = 'admin' OR user_type = 'ops')
                )
            )
        )
    );

CREATE POLICY "Users can upload photos to issues they can access"
    ON public.issue_photos FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.issues
            WHERE issue_id = issue_photos.issue_id
            AND (
                issues.reported_by = auth.uid() OR
                issues.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE user_id = auth.uid() AND (user_type = 'admin' OR user_type = 'ops')
                )
            )
        )
    );

CREATE POLICY "Users can delete their own photo uploads"
    ON public.issue_photos FOR DELETE
    USING (
        auth.uid() = uploaded_by OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND user_type = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.issues TO authenticated;
GRANT ALL ON public.issue_photos TO authenticated;

-- Create storage bucket for issue photos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for issue photos
CREATE POLICY "Public can view issue photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'issue-photos');

CREATE POLICY "Authenticated users can upload issue photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'issue-photos' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete their own uploaded photos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'issue-photos' AND
        auth.uid() = owner
    );
