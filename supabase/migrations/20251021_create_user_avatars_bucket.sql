-- Create user-avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for user avatars
CREATE POLICY "User avatars are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users can upload their own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
);
