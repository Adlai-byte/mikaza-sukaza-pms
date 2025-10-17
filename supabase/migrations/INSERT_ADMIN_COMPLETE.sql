-- ============================================================================
-- INSERT ADMIN USER WITH CORRECT ROLE
-- ============================================================================
-- Email: vinzlloydalferez@gmail.com
-- Password: @Alferez123
-- User Type: admin
-- User ID: 24910a22-e361-4a76-9959-d28959a021d5
-- ============================================================================

-- Step 1: Delete any existing records (clean slate)
DELETE FROM profiles WHERE email = 'vinzlloydalferez@gmail.com';
DELETE FROM users WHERE email = 'vinzlloydalferez@gmail.com';

-- Step 2: Insert into users table with admin role
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
  '24910a22-e361-4a76-9959-d28959a021d5',
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

-- Step 3: Insert into profiles table with admin role
INSERT INTO profiles (
  id,
  user_id,
  email,
  first_name,
  last_name,
  user_type,
  is_active,
  created_at,
  updated_at
) VALUES (
  '24910a22-e361-4a76-9959-d28959a021d5',
  '24910a22-e361-4a76-9959-d28959a021d5',
  'vinzlloydalferez@gmail.com',
  'Vinz Lloyd',
  'Alferez',
  'admin',
  true,
  NOW(),
  NOW()
);

-- Step 4: Verify the inserts
SELECT
  'USERS TABLE' as table_name,
  user_id,
  email,
  first_name,
  last_name,
  user_type,
  is_active
FROM users
WHERE email = 'vinzlloydalferez@gmail.com'

UNION ALL

SELECT
  'PROFILES TABLE' as table_name,
  id as user_id,
  email,
  first_name,
  last_name,
  user_type,
  is_active
FROM profiles
WHERE email = 'vinzlloydalferez@gmail.com';

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- table_name     | user_id                              | email                        | first_name | last_name | user_type | is_active
-- USERS TABLE    | 24910a22-e361-4a76-9959-d28959a021d5 | vinzlloydalferez@gmail.com  | Vinz Lloyd | Alferez   | admin     | true
-- PROFILES TABLE | 24910a22-e361-4a76-9959-d28959a021d5 | vinzlloydalferez@gmail.com  | Vinz Lloyd | Alferez   | admin     | true
-- ============================================================================
