# Fix Providers Assignment - IMMEDIATE SOLUTION

## The Problem
You're getting a **400 Bad Request** error when the app tries to query `property_providers_unified` table. This table is missing from your database.

## The Solution - Run This Script NOW

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Run the Fix Script
1. Open the file: `QUICK_FIX_PROVIDERS.sql` (in the project root)
2. **Copy ALL the contents**
3. **Paste** into the Supabase SQL Editor
4. Click **RUN** (or press Ctrl+Enter)

### Step 3: Check the Results
You should see messages like:
```
✅ Table property_providers_unified is ready
✅ Foreign keys configured
✅ RLS policies enabled
✅ Table query works! Row count: 0
✅ Join with providers works! Count: 0
```

If you see any ❌ errors, copy them and let me know.

### Step 4: Test Your App
1. Refresh your browser (F5)
2. Go to **Properties** → Select a property → Click **Edit**
3. Click the **Providers** tab
4. The error should be **GONE**!
5. You should see two subtabs: "Utility Providers" and "Service Contractors"

## What This Script Does
- Creates the missing `property_providers_unified` table
- Sets up proper foreign key relationships to `providers`, `properties`, and `users` tables
- Creates indexes for performance
- Enables Row Level Security (RLS)
- Adds policies so admin and ops users can manage providers
- Tests that everything works

## Why This Happened
The original migration (`20251017_merge_providers.sql`) created the `providers` table but the `property_providers_unified` table creation failed or was incomplete. This simpler script focuses only on creating what's missing.

## If You Still Get Errors
Run the diagnostic script first:
1. Open `supabase/migrations/diagnose_providers_tables.sql`
2. Copy and run it in SQL Editor
3. Share the output with me

The diagnostic will show exactly what tables exist and what columns they have.
