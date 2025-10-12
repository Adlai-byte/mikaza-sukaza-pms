-- Create Test Users for RBAC Testing
-- Run this in Supabase SQL Editor if no users exist

-- Create Admin User
INSERT INTO public.users (
  email,
  password,
  user_type,
  first_name,
  last_name,
  is_active,
  company,
  cellphone_primary,
  country
)
VALUES (
  'admin@test.com',
  'password123',          -- In production, this should be hashed
  'admin',
  'Admin',
  'User',
  true,
  'Test Company',
  '+1-555-0001',
  'USA'
)
ON CONFLICT (email) DO NOTHING;

-- Create Operations Manager User
INSERT INTO public.users (
  email,
  password,
  user_type,
  first_name,
  last_name,
  is_active,
  company,
  cellphone_primary,
  country
)
VALUES (
  'ops@test.com',
  'password123',          -- In production, this should be hashed
  'ops',
  'Operations',
  'Manager',
  true,
  'Test Company',
  '+1-555-0002',
  'USA'
)
ON CONFLICT (email) DO NOTHING;

-- Create additional test users
INSERT INTO public.users (
  email,
  password,
  user_type,
  first_name,
  last_name,
  is_active,
  company,
  cellphone_primary,
  country
)
VALUES
(
  'john.admin@test.com',
  'password123',
  'admin',
  'John',
  'Admin',
  true,
  'Test Company',
  '+1-555-0003',
  'USA'
),
(
  'jane.ops@test.com',
  'password123',
  'ops',
  'Jane',
  'Operations',
  true,
  'Test Company',
  '+1-555-0004',
  'USA'
)
ON CONFLICT (email) DO NOTHING;

-- Verify users were created
SELECT
  user_id,
  email,
  user_type,
  first_name,
  last_name,
  is_active,
  created_at
FROM public.users
ORDER BY user_type, created_at DESC;
