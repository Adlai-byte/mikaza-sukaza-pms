# Fix Data Loading Issues - Quick Start Guide

## Problem
Users and properties data is not loading due to Row Level Security (RLS) being enabled on the database tables.

## Solution
Run the updated RLS disable migration in your Supabase database.

---

## Quick Fix (3 Steps)

### Step 1: Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **mikaza-sukaza-pms**
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Migration

1. Click **New Query** button
2. Copy the entire contents of `supabase/migrations/20250114_disable_rls_for_dev.sql`
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`

**Note:** The migration is now smart - it checks if each table exists before trying to disable RLS. You won't get errors about missing tables like "bookings" anymore. It will only disable RLS on tables that actually exist in your database.

### Step 3: Verify

Run this verification query in the SQL Editor:

```sql
-- Check that RLS is disabled on key tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'profiles', 'properties', 'bookings', 'tasks', 'issues')
ORDER BY tablename;
```

**Expected Result:** All tables should show `rowsecurity = false`

---

## What the Migration Does

The migration disables Row Level Security on the following tables:

### User Tables
- ✅ users
- ✅ profiles
- ✅ bank_accounts
- ✅ credit_cards

### Property Tables
- ✅ properties
- ✅ amenities
- ✅ rules

### Booking Tables
- ✅ bookings
- ✅ jobs

### Task Tables
- ✅ tasks
- ✅ task_checklists
- ✅ task_comments
- ✅ task_attachments

### Issue Tables
- ✅ issues
- ✅ issue_photos

### Other Tables
- ✅ activity_logs

---

## Troubleshooting

### Issue: "permission denied" error
**Solution:** Make sure you're logged in as the project owner or have admin access.

### Issue: Tables not found
**Solution:** Some tables may not exist yet. The migration uses `ALTER TABLE IF EXISTS`, so missing tables will be skipped safely.

### Issue: Still getting "new row violates RLS policy" errors
**Solution:**
1. Clear your browser cache
2. Log out and log back in
3. Check that the migration ran successfully with the verification query above

### Issue: Migration runs but data still doesn't load
**Solution:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any error messages
4. Check Network tab for failed API requests
5. Verify your Supabase credentials in the `.env` file

---

## Additional Fixes Implemented

### 1. UserManagement Metric Cards ✅
Updated metric cards to match Dashboard design with:
- Gradient backgrounds (blue, green, purple, orange)
- Larger text (3xl font)
- Icon badges with colored backgrounds
- Hover effects and transitions
- Loading states

### 2. Profile Picture Upload ✅
Fixed profile picture upload functionality:
- Added file validation (size, type, security checks)
- Improved error handling
- Added loading spinner during upload
- Updates both `users` table and AuthContext
- Supports both authenticated and development modes

---

## Development vs Production

### Development Mode (Current)
- RLS **DISABLED** for easier development
- All authenticated users have full access
- ⚠️ **WARNING:** This is NOT secure for production!

### Production Mode (Required Before Launch)
- RLS must be **ENABLED**
- Implement proper RLS policies
- Test with different user roles
- See `supabase/migrations/20251005000000_add_rbac_rls_policies.sql` for example policies

---

## Next Steps After Fixing

1. ✅ Verify users data loads in User Management page
2. ✅ Verify properties data loads in Properties page
3. ✅ Test profile picture upload in Profile page
4. ✅ Test user lifecycle features (suspend, archive, reactivate)
5. ✅ Run the user lifecycle migration: `20250116_add_user_lifecycle_management.sql`

---

## Important Notes

- **This migration is for DEVELOPMENT only**
- RLS must be enabled before production deployment
- Keep the service role key secret and secure
- Never commit `.env` files to version control
- Review and update RLS policies before going live

---

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify environment variables
4. Make sure you're using the correct database

---

**Created:** October 16, 2025
**Status:** Ready to Execute
**Priority:** Critical - Required for application to function
