# Apply Providers Migration - FIXED

## Issue
The providers assignment module in property edit is showing a fetch error because the `property_providers_unified` table doesn't exist in the remote database.

## Root Cause
The migration was partially applied - the `providers` table exists but the `property_providers_unified` table is missing.

## Solution - Use the Safe Migration Script

**IMPORTANT**: Use the new safe migration script that handles existing objects.

### Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid
2. Navigate to the "SQL Editor" section
3. Create a new query
4. Copy and paste the entire contents of `supabase/migrations/20251017_fix_property_providers_unified.sql` (NOT the old merge file)
5. Click "Run" to execute the migration

This safe migration script will:
- Create `property_providers_unified` table if it doesn't exist
- Handle the case where `property_providers_new` exists and rename it
- Skip creating triggers/policies that already exist
- Only migrate data that hasn't been migrated yet

### Option 2: Using Supabase CLI (If you have access)

1. Make sure you're authenticated with Supabase CLI:
   ```bash
   npx supabase login
   ```

2. Link your project:
   ```bash
   npx supabase link --project-ref ihzkamfnctfreylyzgid
   ```

3. Push the migrations:
   ```bash
   npx supabase db push
   ```

## What This Migration Does

The migration creates a unified providers system that combines:
- **Service Providers** (contractors, maintenance companies)
- **Utility Providers** (electric, internet, water, etc.)

Into a single system with these tables:
- `providers` - Unified provider directory
- `property_providers_unified` - Links providers to properties
- `provider_documents` - Provider documentation
- `provider_reviews` - Provider reviews and ratings

## Verification

After running the migration, you can verify it worked by:

1. Go to Supabase Dashboard → Table Editor
2. Check that these tables exist:
   - `providers`
   - `property_providers_unified`
   - `provider_documents`
   - `provider_reviews`

3. Test the providers assignment in your application by:
   - Going to Properties → Edit Property → Providers tab
   - Try assigning a utility provider or service contractor
   - The fetch error should be gone

## Backup Note

The migration preserves old tables (`service_providers`, `utility_providers`, etc.) as backups. They can be manually dropped later if desired.
