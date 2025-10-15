# 🚀 Quick Fix Steps - Copy & Paste Ready

## Step 1: Run RLS Migration (2 minutes)

1. Go to https://supabase.com/dashboard
2. Open SQL Editor
3. Copy & paste the entire file: `supabase/migrations/20250114_disable_rls_for_dev.sql`
4. Click **Run**

---

## Step 2: Fix User Roles (1 minute)

In Supabase SQL Editor, run:

```sql
UPDATE users
SET user_type = CASE
    WHEN user_type IN ('Administrator', 'ADMIN', 'Admin') THEN 'admin'
    WHEN user_type IN ('Ops', 'OPS', 'Operations') THEN 'ops'
    ELSE LOWER(user_type)
END;

UPDATE profiles
SET user_type = CASE
    WHEN user_type IN ('Administrator', 'ADMIN', 'Admin') THEN 'admin'
    WHEN user_type IN ('Ops', 'OPS', 'Operations') THEN 'ops'
    ELSE LOWER(user_type)
END;

SELECT user_type, COUNT(*) FROM users GROUP BY user_type;
```

Expected result: `admin` and `ops` (lowercase)

---

## Step 3: Refresh Session (30 seconds)

1. Log out of the app
2. Log back in

**Done!** ✅

---

## Verify It Works

- [ ] Properties page shows data
- [ ] User Management page opens (no "Access Denied")
- [ ] Profile picture upload works
- [ ] Metric cards have gradients

---

## Optional: Phase 2 Features (2 minutes)

Run this in SQL Editor:

Copy & paste entire file: `supabase/migrations/20250116_add_user_lifecycle_management.sql`

Enables: Suspend, Archive, Last Login tracking

---

**Total Time:** ~5 minutes
**Files:** See `COMPLETE_FIX_GUIDE.md` for full details
