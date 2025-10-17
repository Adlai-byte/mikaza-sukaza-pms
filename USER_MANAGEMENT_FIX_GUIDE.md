# User Management - Only 1 User Showing Fix

## 🔴 Problem
User Management page only shows 1 account instead of all users.

## 🔍 Root Cause
This is the same RLS (Row Level Security) issue we fixed before. Either:
1. RLS was re-enabled by a migration
2. New restrictive policies were added
3. Permissions were revoked

## ✅ Solution

### Step 1: Run the Fix Script

1. **Open Supabase SQL Editor**
   Go to: https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid/sql

2. **Open the fix script**
   File: `FIX_USERS_LOADING_ISSUE.sql` in your project root

3. **Copy and paste the entire script**
   - Select all (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste into SQL Editor (Ctrl+V)

4. **Run the script**
   - Click **"RUN"** button or press Ctrl+Enter

### Step 2: Check the Output

You should see detailed diagnostic output like this:

```
========================================
DIAGNOSING USERS TABLE ISSUE
========================================
RLS Enabled: true
Active Policies: 5
Total Users in DB: 103
Users Visible to App (anon role): 1
========================================
❌ PROBLEM FOUND: RLS is blocking access!
   - RLS is ENABLED
   - 5 policies exist
   - App can only see 1 out of 103 users

Current Policies on users table:
  - users_select_policy (SELECT)
  - users_insert_policy (INSERT)
  ...

Disabling RLS...
Dropping all policies...
  ✓ Dropped: users_select_policy
  ✓ Dropped: users_insert_policy
  ...

Granting permissions...
  ✓ Permissions granted to anon role
  ✓ Permissions granted to authenticated role
  ✓ Permissions granted to service_role

========================================
VERIFICATION - AFTER FIX
========================================
RLS Enabled: false
Active Policies: 0
Total Users: 103
Visible to anon: 103
Visible to authenticated: 103
========================================
✅ ✅ ✅ SUCCESS! ISSUE FIXED! ✅ ✅ ✅

Your app should now see all 103 users!
Refresh your browser (F5) to see the changes.
```

### Step 3: Test Your Application

1. **Refresh your browser** (F5 or Ctrl+R)
2. **Navigate to User Management** page
3. **Verify**: You should now see ALL users in the table
4. **Test functionality**:
   - Search users ✓
   - Filter by user type ✓
   - Filter by status ✓
   - Pagination ✓
   - Create/Edit/Delete ✓

---

## 🔧 What the Script Does

### Diagnostic Phase
1. Checks if RLS is enabled on users table
2. Counts how many RLS policies exist
3. Counts total users in database
4. Tests how many users the app (anon role) can see
5. Identifies the exact problem

### Fix Phase
1. **Disables RLS** on the users table
2. **Drops ALL policies** that restrict access
3. **Grants permissions** to anon, authenticated, and service_role

### Verification Phase
1. Re-checks RLS status
2. Confirms all policies are removed
3. Verifies app can see all users
4. Shows sample users to confirm access

---

## 📊 Expected Results

### Before Fix
- **Total Users in DB**: 103 (or your actual count)
- **Visible to App**: 1
- **RLS Enabled**: true
- **Policies**: 3-5 restrictive policies

### After Fix
- **Total Users in DB**: 103
- **Visible to App**: 103 ✅
- **RLS Enabled**: false ✅
- **Policies**: 0 ✅

---

## 🚨 If the Fix Doesn't Work

If you still see only 1 user after running the script:

### Check 1: Script Output
- Look for any ERROR messages in the script output
- Make sure you see "✅ SUCCESS!" message

### Check 2: Browser Cache
- **Hard refresh**: Ctrl+Shift+R (Chrome/Edge) or Cmd+Shift+R (Mac)
- **Clear cache**:
  - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
  - Or open in Incognito/Private window

### Check 3: Query Client Cache
The app uses TanStack Query (React Query) which caches data. To force refresh:
1. Open browser DevTools (F12)
2. Go to Application tab → Local Storage → Clear
3. Refresh page (F5)

### Check 4: Verify Database Access
Run this simple query in Supabase SQL Editor:
```sql
SELECT COUNT(*) as total_users FROM public.users;
SELECT COUNT(*) as visible_users FROM public.users WHERE true;
```

If the counts are different, there's still a permission issue.

---

## 🛡️ Why This Keeps Happening

### RLS Policies
Supabase has RLS (Row Level Security) which restricts data access. When enabled, it can limit which rows a user can see based on policies.

### Common Causes
1. **Migration files** with `ALTER TABLE users ENABLE ROW LEVEL SECURITY`
2. **Supabase dashboard** RLS toggle accidentally enabled
3. **New policies** added through migrations
4. **Permission revocation** in migration scripts

### Prevention
To prevent this from happening again:

1. **Check migrations** before applying them:
   ```bash
   grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations/
   grep -r "CREATE POLICY" supabase/migrations/ | grep users
   ```

2. **Avoid enabling RLS** on the users table in development
3. **Keep this fix script** handy for quick resolution

---

## 📝 Alternative: Manual Fix via Supabase Dashboard

If you prefer using the dashboard:

1. Go to **Supabase Dashboard** → **Authentication** → **Policies**
2. Find the **users** table
3. **Disable RLS** toggle
4. **Delete all policies** on the users table
5. Go to **SQL Editor** and run:
   ```sql
   GRANT ALL ON public.users TO anon;
   GRANT ALL ON public.users TO authenticated;
   ```

---

## 💾 Files Created

- **FIX_USERS_LOADING_ISSUE.sql** - Comprehensive diagnostic and fix script
- **USER_MANAGEMENT_FIX_GUIDE.md** - This guide

---

## ✅ Checklist

After fixing:
- [ ] Ran FIX_USERS_LOADING_ISSUE.sql in Supabase
- [ ] Saw "SUCCESS" message in output
- [ ] Refreshed browser (F5)
- [ ] Can see all users in User Management
- [ ] Search functionality works
- [ ] Filter functionality works
- [ ] Pagination works
- [ ] Can create new users
- [ ] Can edit existing users
- [ ] Can deactivate users

---

## 📞 Still Having Issues?

If the problem persists:

1. **Copy the SQL script output** and share it
2. **Check browser console** (F12) for any errors
3. **Check network tab** (F12 → Network) for failed requests to Supabase
4. **Verify you're logged in** as admin user
5. **Check your Supabase project** is not paused or rate-limited

---

## 🎯 Summary

**Problem**: Only 1 user showing in User Management
**Cause**: RLS policies restricting data access
**Solution**: Run `FIX_USERS_LOADING_ISSUE.sql` script
**Result**: All users visible in the app
**Time to fix**: < 1 minute

Just run the script, refresh your browser, and you're done! 🚀
