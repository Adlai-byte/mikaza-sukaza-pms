-- SQL Script to Create Admin User
-- Run this in Supabase Dashboard → SQL Editor

-- Insert admin user into users table
-- This bypasses RLS policies when run in SQL Editor

INSERT INTO users (
  user_id,
  email,
  password,
  first_name,
  last_name,
  user_type,
  is_active,
  country,
  created_at,
  updated_at
) VALUES (
  '24910a22-e361-4a76-9959-d28959a021d5',  -- Auth user ID from previous step
  'vinzlloydalferez@gmail.com',
  '@Alferez123',
  'Vinz Lloyd',
  'Alferez',
  'admin',
  true,
  'USA',
  NOW(),
  NOW()
);

-- Verify the user was created
SELECT user_id, email, first_name, last_name, user_type, is_active
FROM users
WHERE email = 'vinzlloydalferez@gmail.com';
