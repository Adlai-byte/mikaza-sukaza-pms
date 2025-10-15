# Create Admin User: vinzlloydalferez@gmail.com

## Option 1: Via Supabase Dashboard (RECOMMENDED)

This is the easiest and most reliable method:

### Step 1: Create Supabase Auth User

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid
2. Navigate to **Authentication** → **Users**
3. Click **Add User** (or **Invite**)
4. Enter:
   - **Email:** `vinzlloydalferez@gmail.com`
   - **Password:** `@Alferez123`
   - **Auto Confirm User:** ✅ **CHECK THIS BOX** (important - skips email verification)
5. Click **Create User** or **Send Invitation**
6. **Copy the User ID** that appears (it looks like: `123e4567-e89b-12d3-a456-426614174000`)

### Step 2: Insert into Database

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste this SQL (replace `YOUR_COPIED_USER_ID` with the ID from Step 1):

```sql
-- Insert admin user into users table
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
  'YOUR_COPIED_USER_ID',  -- ⚠️ REPLACE WITH YOUR COPIED USER ID
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
```

4. Click **Run** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

### Step 3: Test Login

1. Go to your application: http://localhost:8080/auth
2. Login with:
   - **Email:** `vinzlloydalferez@gmail.com`
   - **Password:** `@Alferez123`
3. You should be redirected to the dashboard with full admin access

---

## Option 2: Via SQL Script (Alternative)

If you prefer to do everything via SQL, you can use this approach:

### Step 1: Run SQL to Create User

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste this SQL:

```sql
-- This creates a basic user entry that can be linked to Supabase Auth
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
  gen_random_uuid(),  -- Generates a random UUID
  'vinzlloydalferez@gmail.com',
  '@Alferez123',
  'Vinz Lloyd',
  'Alferez',
  'admin',
  true,
  'USA',
  NOW(),
  NOW()
)
RETURNING user_id;
```

4. **Copy the returned user_id**

### Step 2: Create Supabase Auth User Manually

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter:
   - **Email:** `vinzlloydalferez@gmail.com`
   - **Password:** `@Alferez123`
   - **Auto Confirm User:** ✅ CHECK THIS
4. Copy the new User ID

### Step 3: Update Database User ID

```sql
-- Update the users table with the Supabase Auth user ID
UPDATE users
SET user_id = 'SUPABASE_AUTH_USER_ID'  -- ⚠️ REPLACE WITH COPIED ID
WHERE email = 'vinzlloydalferez@gmail.com';
```

---

## Option 3: Use Application (After Admin Exists)

Once you have ANY admin account working, you can create additional users (including admins) through the application:

1. Log in as an existing admin
2. Go to **User Management**
3. Click **Add User**
4. Fill in the form:
   - First Name: Vinz Lloyd
   - Last Name: Alferez
   - Email: vinzlloydalferez@gmail.com
   - Password: @Alferez123
   - User Type: Admin
   - Is Active: Yes
5. Click **Create User**

---

## Troubleshooting

### Issue: "Email already exists"

If you get this error, the email might already be in the system. Check:

```sql
-- Check if user exists in users table
SELECT * FROM users WHERE email = 'vinzlloydalferez@gmail.com';

-- Check Supabase Auth users in Dashboard
-- Authentication → Users → Search for vinzlloydalferez@gmail.com
```

**Solution:** Delete existing entries first:
```sql
DELETE FROM users WHERE email = 'vinzlloydalferez@gmail.com';
-- Then delete from Supabase Auth via Dashboard
```

### Issue: "Invalid login credentials"

**Possible causes:**
1. Password doesn't match what was set in Supabase Auth
2. User was not auto-confirmed (email not verified)
3. user_id mismatch between Auth and database

**Solution:**
1. Verify user exists in both Auth and database
2. Check "Email Confirmed" column in Auth dashboard
3. Ensure user_id matches exactly

### Issue: "Email Not Verified"

**Solution:**
1. In Supabase Dashboard → Authentication → Users
2. Find vinzlloydalferez@gmail.com
3. Click the user
4. Click **Confirm Email** button

---

## Verification Steps

After creating the admin account, verify it works:

1. **Check Database:**
```sql
SELECT user_id, email, first_name, last_name, user_type, is_active
FROM users
WHERE email = 'vinzlloydalferez@gmail.com';
```

Should return:
- user_id: (a UUID)
- email: vinzlloydalferez@gmail.com
- first_name: Vinz Lloyd
- last_name: Alferez
- user_type: admin
- is_active: true

2. **Check Supabase Auth:**
- Go to Authentication → Users
- Find vinzlloydalferez@gmail.com
- Verify "Email Confirmed" shows a checkmark ✓

3. **Test Login:**
- Go to http://localhost:8080/auth
- Login with credentials
- Should redirect to dashboard
- Check that you can access User Management page (admin-only feature)

---

## Quick Reference

**Email:** vinzlloydalferez@gmail.com
**Password:** @Alferez123
**User Type:** admin
**Name:** Vinz Lloyd Alferez

**Supabase Dashboard:** https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid
**Application URL:** http://localhost:8080/auth

---

## Next Steps After Login

1. ✅ Verify you can access all pages
2. ✅ Test creating a new ops user via User Management
3. ✅ Test the email verification flow with the new user
4. ✅ Update your profile information if needed
5. ✅ Change password if desired (via profile settings)

---

**Note:** The password `@Alferez123` meets all requirements:
- ✅ 8+ characters (11 characters)
- ✅ Uppercase letter (A)
- ✅ Lowercase letters (lferez)
- ✅ Number (123)
- ✅ Special character (@)

Good luck! Your admin account should be ready to use.
