# User Lifecycle Management Migration Instructions

## Overview
This migration adds user lifecycle management fields to support suspending, archiving, and tracking user activity.

## Migration File
`supabase/migrations/20250116_add_user_lifecycle_management.sql`

## What This Migration Does

### 1. Adds New Columns to `users` Table
- `account_status` - TEXT ('active', 'suspended', 'archived')
- `suspended_at` - TIMESTAMPTZ
- `suspended_by` - UUID (references users.user_id)
- `suspension_reason` - TEXT
- `archived_at` - TIMESTAMPTZ
- `archived_by` - UUID (references users.user_id)
- `last_login_at` - TIMESTAMPTZ

### 2. Adds Same Fields to `profiles` Table
- `account_status` - TEXT ('active', 'suspended', 'archived')
- `last_login_at` - TIMESTAMPTZ

### 3. Creates Performance Indexes
- `idx_users_account_status` - For filtering by account status
- `idx_users_last_login` - For sorting by last login
- `idx_users_suspended_at` - For suspended users

### 4. Creates Useful Views
- `active_users` - Shows only active and suspended users (excludes archived)
- `inactive_users` - Shows users who haven't logged in for 90+ days

### 5. Creates Sync Trigger
- Automatically syncs `account_status` and `last_login_at` between `users` and `profiles` tables

## How to Run the Migration

### Option 1: Using Supabase CLI (Recommended)

1. Make sure Supabase CLI is installed:
```bash
npm install -g supabase
```

2. Link your project (if not already linked):
```bash
supabase link --project-ref your-project-ref
```

3. Run the migration:
```bash
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/20250116_add_user_lifecycle_management.sql`
4. Paste into the SQL Editor
5. Click **Run** or press `Ctrl+Enter`

### Option 3: Manual SQL Execution

Connect to your database and run the SQL file:
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20250116_add_user_lifecycle_management.sql
```

## Verification

After running the migration, verify it worked correctly:

```sql
-- Check that new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('account_status', 'suspended_at', 'suspended_by',
                    'suspension_reason', 'archived_at', 'archived_by',
                    'last_login_at');

-- Should return 7 rows

-- Check that all existing users have 'active' status
SELECT account_status, COUNT(*)
FROM users
GROUP BY account_status;

-- Should show all users with 'active' status

-- Check that views were created
SELECT viewname FROM pg_views
WHERE viewname IN ('active_users', 'inactive_users');

-- Should return 2 rows

-- Check that trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'sync_user_profile_status_trigger';

-- Should return 1 row
```

## Post-Migration Steps

1. **Update Application Code** ✅ DONE
   - AuthContext.tsx updated to track last_login_at
   - User schema updated with lifecycle fields
   - UserTable updated to display account status
   - Created SuspendUserDialog, ArchiveUserDialog, ReactivateUserDialog

2. **Test Lifecycle Features**
   - Suspend a test user
   - Archive a test user
   - Reactivate suspended/archived users
   - Verify login tracking works

3. **Enable RLS Policies** (Next Phase)
   - Review existing RLS policies
   - Update policies to handle suspended/archived users
   - Test with different user roles

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS sync_user_profile_status_trigger ON users;
DROP FUNCTION IF EXISTS sync_user_profile_status();

-- Remove views
DROP VIEW IF EXISTS inactive_users;
DROP VIEW IF EXISTS active_users;

-- Remove indexes
DROP INDEX IF EXISTS idx_users_suspended_at;
DROP INDEX IF EXISTS idx_users_last_login;
DROP INDEX IF EXISTS idx_users_account_status;

-- Remove columns from profiles
ALTER TABLE profiles
DROP COLUMN IF EXISTS last_login_at,
DROP COLUMN IF EXISTS account_status;

-- Remove columns from users
ALTER TABLE users
DROP COLUMN IF EXISTS last_login_at,
DROP COLUMN IF EXISTS archived_by,
DROP COLUMN IF EXISTS archived_at,
DROP COLUMN IF EXISTS suspension_reason,
DROP COLUMN IF EXISTS suspended_by,
DROP COLUMN IF EXISTS suspended_at,
DROP COLUMN IF EXISTS account_status;
```

## Impact Assessment

### Breaking Changes
None - this is a backward-compatible migration that adds new optional fields.

### Performance Impact
- Minor positive impact from indexes on frequently filtered columns
- Trigger adds negligible overhead (only fires on status changes)

### Data Migration
- All existing users automatically set to 'active' status
- No data loss or modification of existing fields

## Support

If you encounter any issues:
1. Check the Supabase logs for error messages
2. Verify your database permissions
3. Ensure no other migrations are running concurrently
4. Review the verification queries above

---

**Created:** January 16, 2025
**Last Updated:** October 16, 2025
**Status:** Ready to Deploy
