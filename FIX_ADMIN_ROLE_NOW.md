# 🚨 FIX ADMIN ROLE - ACTION REQUIRED

## Issue
You logged in successfully but **you're not an admin**. This is because the database record was not properly inserted.

---

## ✅ QUICK FIX (3 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: **https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid**
2. Click **SQL Editor** in the left sidebar
3. Click **New Query** button

### Step 2: Run This SQL

Copy and paste this **COMPLETE** SQL script:

```sql
-- ============================================================================
-- INSERT ADMIN USER WITH CORRECT ROLE
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
  user_type,
  is_active
FROM users
WHERE email = 'vinzlloydalferez@gmail.com'

UNION ALL

SELECT
  'PROFILES TABLE' as table_name,
  id as user_id,
  email,
  user_type,
  is_active
FROM profiles
WHERE email = 'vinzlloydalferez@gmail.com';
```

### Step 3: Click Run

- Click the **"Run"** button (or press Ctrl+Enter)
- You should see a result table showing **TWO rows**:
  - USERS TABLE: user_type = admin
  - PROFILES TABLE: user_type = admin

### Step 4: Log Out and Log Back In

1. In your application, click **Log Out**
2. Go back to: http://localhost:8080/auth
3. Log in again with:
   - Email: `vinzlloydalferez@gmail.com`
   - Password: `@Alferez123`

### Step 5: Verify Admin Access

You should now see:
- ✅ "User Management" in the sidebar (admin-only feature)
- ✅ Access to all pages
- ✅ Full admin privileges

---

## Why This Happened

When you created the account through the UI, the application tried to insert the user record but it was **blocked by Row Level Security (RLS) policies**. The RLS policies prevent unauthenticated users from inserting records.

Running SQL in the **SQL Editor** bypasses RLS because it uses the **service_role** credentials with full database access.

---

## What the SQL Does

1. **DELETE** any existing partial records
2. **INSERT** into `users` table with `user_type = 'admin'`
3. **INSERT** into `profiles` table with `user_type = 'admin'`
4. **VERIFY** both records were created correctly

---

## Files Created for You

- **`INSERT_ADMIN_COMPLETE.sql`** - The SQL script to run
- **`FIX_ADMIN_ROLE_NOW.md`** - This file (step-by-step guide)
- **`fix-admin-role.mjs`** - Diagnostic script

---

## Verification

After running the SQL and logging back in, you can verify admin access by:

1. **Check Sidebar:** Do you see "User Management"?
2. **Try Creating User:** Go to User Management → Add User
3. **Check Browser Console:** Should show `user_type: 'admin'`

Run this to verify database records:
```bash
node fix-admin-role.mjs
```

Should show:
```
✅ User found in users table
   User Type: admin
✅ Profile found
   User Type: admin
```

---

## Summary

**Do this NOW:**

1. ✅ Open Supabase Dashboard → SQL Editor
2. ✅ Copy/paste the SQL script above
3. ✅ Click Run
4. ✅ Log out and log back in
5. ✅ Verify you have admin access

**Total time: 2-3 minutes**

Once done, you'll have full admin access to create users, manage properties, and access all features! 🎉
