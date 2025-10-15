# Get Service Role Key from Supabase Dashboard

## How to Get the Correct Service Role Key

The key you provided (`sb_secret_jnjttqCZH8LCi1rhAcPvpQ_TR_euezd`) is the **secret** but we need the full **JWT token**.

### Steps:

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid

2. **Navigate to Settings:**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **API** section

3. **Find Service Role Key:**
   - Scroll down to **Project API keys** section
   - Look for **service_role** key (NOT the anon key)
   - It should be a long JWT token starting with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **Copy the Full Token:**
   - Click the **copy icon** next to the service_role key
   - The full token should be about 300+ characters long

---

## Alternative: I Can Use SQL Directly

Since we're having issues with the service role key format, the **easiest solution** is to just run the SQL in Supabase Dashboard:

### Quick SQL Fix:

1. **Open Supabase Dashboard → SQL Editor**
2. **Paste this SQL:**

```sql
-- Clean up any existing records
DELETE FROM profiles WHERE email = 'vinzlloydalferez@gmail.com';
DELETE FROM users WHERE email = 'vinzlloydalferez@gmail.com';

-- Insert admin user
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

-- Insert profile
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

-- Verify
SELECT 'users' as table_name, user_id, email, user_type, is_active FROM users WHERE email = 'vinzlloydalferez@gmail.com'
UNION ALL
SELECT 'profiles' as table_name, id as user_id, email, user_type, is_active FROM profiles WHERE email = 'vinzlloydalferez@gmail.com';
```

3. **Click Run**

4. **Log out and log back in**

This will take 2 minutes and will definitely work!

---

## Why SQL Editor Works

The SQL Editor in Supabase Dashboard automatically uses the **service_role** credentials, which bypass all RLS policies. That's why it's the most reliable way to insert admin users.

---

## After Running the SQL

1. **Log out** of your application
2. **Log back in** with:
   - Email: vinzlloydalferez@gmail.com
   - Password: @Alferez123
3. **You should see "User Management"** in the sidebar
4. **You now have full admin access!**

---

## Verification

Run this to verify:
```bash
node check-user-status.mjs
```

Should show:
```
✅ Database record: EXISTS
✅ User Type: admin
✅ Profile found
✅ Profile User Type: admin
```
