# Troubleshooting: Users Not Loading

## Current Status
- ✅ Properties loading correctly
- ❌ Users still not loading

## Step-by-Step Troubleshooting

### Step 1: Check Browser Console

1. Open the User Management page
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for errors (especially red text)

**Common errors to look for:**
- `Failed to fetch users`
- `new row violates row-level security policy`
- `permission denied for table users`
- `Error: users fetch error`

**Share with me:** What error message do you see?

---

### Step 2: Run Diagnostic Queries

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `DIAGNOSE_USERS_ISSUE.sql`
3. Run the entire script
4. Look at the results

**What to check:**
- Query #2: Is RLS disabled? Should say "✅ RLS is DISABLED"
- Query #1: Are there users in the table? Count should be > 0
- Query #4: Does 'authenticated' have ALL privileges?

---

### Step 3: Verify Migration Ran Successfully

Run this simple check:

```sql
-- Check RLS status
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'properties')
ORDER BY tablename;
```

**Expected result:**
```
tablename    | rls_enabled
-------------|------------
properties   | false       ✅
users        | false       ✅
```

If `users` shows `true`, the migration didn't work for users table.

---

### Step 4: Manual Fix (If RLS Still Enabled)

If diagnostic shows RLS is still enabled on users, run this:

```sql
-- Force disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Verify it worked
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';
```

Should return: `rowsecurity = false`

---

### Step 5: Check Network Tab

1. In DevTools, go to **Network** tab
2. Refresh the User Management page
3. Look for a request to Supabase (something like `rest/v1/users`)
4. Click on it
5. Check the **Response** tab

**Possible responses:**

**Case A: Empty array `[]`**
- This means query succeeded but no data
- Check: Are there actually users in the database?
- Run: `SELECT COUNT(*) FROM users;`

**Case B: Error response**
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy"
}
```
- This means RLS is still blocking
- Go back to Step 4 and run manual fix

**Case C: 200 OK with data**
- Users data is loading correctly
- Issue might be in React rendering
- Check React console logs

---

### Step 6: Check React Query Cache

The app uses React Query for caching. Sometimes cache can cause issues.

**Clear React Query cache:**

1. Open Console in DevTools
2. Run this command:
```javascript
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

This will clear all cache and reload the page.

---

### Step 7: Check Auth Token

Users query requires authentication. Let's verify the token is valid.

**In browser console, run:**
```javascript
// Check if user is authenticated
const { data } = await window.supabase.auth.getSession();
console.log('Session:', data.session);
console.log('User:', data.session?.user);
```

**Expected:** Should show user object with email and id

**If null:** You're not logged in properly
- Log out completely
- Clear browser cache
- Log back in

---

### Step 8: Compare with Properties Query

Since properties work, let's compare:

**Properties query works:**
```typescript
.from('properties')
.select('*')
```

**Users query:**
```typescript
.from('users')
.select('*')
```

Both are identical, so if properties work but users don't, it's definitely an RLS/permissions issue on the users table specifically.

---

## Quick Fix Checklist

Try these in order:

1. ☐ Run diagnostic queries (`DIAGNOSE_USERS_ISSUE.sql`)
2. ☐ Check if RLS is disabled on users table
3. ☐ If RLS is enabled, run manual disable command
4. ☐ Check browser console for errors
5. ☐ Clear browser cache and reload
6. ☐ Log out and log back in
7. ☐ Check Network tab for API response
8. ☐ Verify you're logged in as admin user

---

## Common Issues & Solutions

### Issue: "Permission denied for table users"
**Solution:**
```sql
GRANT ALL ON public.users TO authenticated;
```

### Issue: "new row violates row-level security policy"
**Solution:**
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

### Issue: Empty array returned but users exist in database
**Solution:** Check if you're logged in with the correct account

### Issue: Users load but show as empty in UI
**Solution:** Check UserTable component - might be a rendering issue

---

## What to Share With Me

To help diagnose further, please share:

1. **Browser console error** (screenshot or copy-paste)
2. **Result from diagnostic query #2** (RLS status)
3. **Network tab response** for the users API call
4. **Result of this query:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';
   ```

---

## Nuclear Option (Last Resort)

If nothing else works, we can force-create a simple query bypass:

```sql
-- Create a public function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM users ORDER BY created_at DESC;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
```

Then modify the hook to use: `supabase.rpc('get_all_users')`

But let's try the other steps first!

---

**Created:** October 16, 2025
**Status:** Diagnostic Guide
**Next:** Please run diagnostic queries and share results
