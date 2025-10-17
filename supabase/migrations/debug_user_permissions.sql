-- Debug script to check user permissions
-- Run this in your Supabase SQL Editor

-- 1. Check your user record
SELECT
  user_id,
  email,
  first_name,
  last_name,
  user_type,
  is_active,
  created_at
FROM users
WHERE is_active = true
ORDER BY created_at DESC;

-- 2. Check if user_type is exactly 'admin' (case sensitive)
SELECT
  user_id,
  email,
  user_type,
  length(user_type) as type_length,
  user_type = 'admin' as is_admin,
  user_type = 'ops' as is_ops
FROM users
WHERE is_active = true;

-- 3. If you find issues, fix with this:
-- UPDATE users
-- SET user_type = 'admin'
-- WHERE email = 'your-email@example.com';
