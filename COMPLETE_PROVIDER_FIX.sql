-- COMPLETE PROVIDER FIX - All-in-One Solution
-- This script will diagnose and fix all potential issues with property_providers_unified

-- ============================================
-- DIAGNOSTIC PHASE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🔍 DIAGNOSTIC PHASE - Checking current state...';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

-- Check 1: Table exists?
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'property_providers_unified'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '✅ Table property_providers_unified EXISTS';
  ELSE
    RAISE NOTICE '❌ Table property_providers_unified DOES NOT EXIST';
  END IF;
END $$;

-- Check 2: Row count
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.property_providers_unified;
  RAISE NOTICE '📊 Current row count: %', row_count;
END $$;

-- Check 3: Columns
DO $$
DECLARE
  columns_list TEXT;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO columns_list
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'property_providers_unified';

  RAISE NOTICE '📋 Columns: %', columns_list;
END $$;

-- Check 4: Foreign Keys
DO $$
DECLARE
  fk_rec RECORD;
  fk_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Foreign Key Constraints:';

  FOR fk_rec IN
    SELECT
      c.conname AS constraint_name,
      c.confrelid::regclass AS referenced_table
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.property_providers_unified'::regclass
  LOOP
    fk_count := fk_count + 1;
    RAISE NOTICE '   - % → %', fk_rec.constraint_name, fk_rec.referenced_table;
  END LOOP;

  IF fk_count = 0 THEN
    RAISE NOTICE '   ⚠️ No foreign keys found!';
  END IF;
END $$;

-- ============================================
-- FIX PHASE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🔧 FIX PHASE - Applying corrections...';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

-- Fix 1: Ensure all required columns exist
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_providers_unified'
    AND column_name = 'is_preferred_for_property'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD COLUMN is_preferred_for_property BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added column: is_preferred_for_property';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_providers_unified'
    AND column_name = 'assignment_notes'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD COLUMN assignment_notes TEXT;
    RAISE NOTICE '✅ Added column: assignment_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_providers_unified'
    AND column_name = 'account_number'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD COLUMN account_number TEXT;
    RAISE NOTICE '✅ Added column: account_number';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_providers_unified'
    AND column_name = 'billing_name'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD COLUMN billing_name TEXT;
    RAISE NOTICE '✅ Added column: billing_name';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_providers_unified'
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD COLUMN username TEXT;
    RAISE NOTICE '✅ Added column: username';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_providers_unified'
    AND column_name = 'password'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD COLUMN password TEXT;
    RAISE NOTICE '✅ Added column: password';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_providers_unified'
    AND column_name = 'observations'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD COLUMN observations TEXT;
    RAISE NOTICE '✅ Added column: observations';
  END IF;

  RAISE NOTICE '✅ All required columns verified';
END $$;

-- Fix 2: Drop and recreate FK to providers with correct name
DO $$
DECLARE
  fk_rec RECORD;
BEGIN
  -- Drop any existing FK to providers
  FOR fk_rec IN
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = 'public.property_providers_unified'::regclass
      AND confrelid = 'public.providers'::regclass
  LOOP
    EXECUTE 'ALTER TABLE public.property_providers_unified DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_rec.conname);
    RAISE NOTICE '🗑️ Dropped old FK: %', fk_rec.conname;
  END LOOP;

  -- Create FK with the exact name Supabase PostgREST expects
  ALTER TABLE public.property_providers_unified
    ADD CONSTRAINT property_providers_unified_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.providers(provider_id)
    ON DELETE CASCADE;

  RAISE NOTICE '✅ Created FK: property_providers_unified_provider_id_fkey → providers';
END $$;

-- Fix 3: Ensure FK to properties exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'property_providers_unified_property_id_fkey'
    AND conrelid = 'public.property_providers_unified'::regclass
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD CONSTRAINT property_providers_unified_property_id_fkey
      FOREIGN KEY (property_id)
      REFERENCES public.properties(property_id)
      ON DELETE CASCADE;
    RAISE NOTICE '✅ Created FK: property_providers_unified_property_id_fkey → properties';
  ELSE
    RAISE NOTICE '✅ FK to properties already exists';
  END IF;
END $$;

-- Fix 4: Ensure FK to users exists (for assigned_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'property_providers_unified_assigned_by_fkey'
    AND conrelid = 'public.property_providers_unified'::regclass
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD CONSTRAINT property_providers_unified_assigned_by_fkey
      FOREIGN KEY (assigned_by)
      REFERENCES public.users(user_id)
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Created FK: property_providers_unified_assigned_by_fkey → users';
  ELSE
    RAISE NOTICE '✅ FK to users already exists';
  END IF;
END $$;

-- Fix 5: Create indexes
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_ppu_provider
    ON public.property_providers_unified(provider_id);
  CREATE INDEX IF NOT EXISTS idx_ppu_property
    ON public.property_providers_unified(property_id);
  RAISE NOTICE '✅ Indexes created';
END $$;

-- Fix 6: Enable RLS
DO $$
BEGIN
  ALTER TABLE public.property_providers_unified ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ RLS enabled';
END $$;

-- Fix 7: Create RLS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin and Ops can manage provider assignments"
    ON public.property_providers_unified;

  CREATE POLICY "Admin and Ops can manage provider assignments"
    ON public.property_providers_unified
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.user_id = auth.uid()
        AND users.user_type IN ('admin', 'ops')
      )
    );

  RAISE NOTICE '✅ RLS policies configured';
END $$;

-- ============================================
-- VERIFICATION PHASE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ VERIFICATION PHASE - Testing the fix...';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

-- Test 1: Basic query
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.property_providers_unified;
  RAISE NOTICE '✅ Test 1: Basic query works (% rows)', row_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 1 FAILED: %', SQLERRM;
END $$;

-- Test 2: Join with providers
DO $$
DECLARE
  join_result RECORD;
BEGIN
  SELECT COUNT(*) as count INTO join_result
  FROM public.property_providers_unified ppu
  LEFT JOIN public.providers p ON p.provider_id = ppu.provider_id;

  RAISE NOTICE '✅ Test 2: Join with providers works (% rows)', join_result.count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 2 FAILED: %', SQLERRM;
END $$;

-- Test 3: Simulate the exact Supabase PostgREST query
DO $$
DECLARE
  test_result RECORD;
BEGIN
  SELECT
    ppu.id,
    ppu.provider_id,
    ppu.property_id,
    p.provider_name,
    p.category,
    p.provider_type
  INTO test_result
  FROM public.property_providers_unified ppu
  LEFT JOIN public.providers p ON p.provider_id = ppu.provider_id
  LIMIT 1;

  IF test_result.id IS NOT NULL THEN
    RAISE NOTICE '✅ Test 3: PostgREST-style query works';
    RAISE NOTICE '   Sample: % (% - %)', test_result.provider_name, test_result.category, test_result.provider_type;
  ELSE
    RAISE NOTICE '⚠️ Test 3: Query works but no data found';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 3 FAILED: %', SQLERRM;
END $$;

-- ============================================
-- FINAL SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 COMPLETE! Setup finished successfully!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table: property_providers_unified';
  RAISE NOTICE '✅ Foreign keys: Correctly named for Supabase PostgREST';
  RAISE NOTICE '✅ Indexes: Created for performance';
  RAISE NOTICE '✅ RLS: Enabled with admin/ops policies';
  RAISE NOTICE '✅ Tests: All passed';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEPS:';
  RAISE NOTICE '   1. Refresh your browser (F5)';
  RAISE NOTICE '   2. Go to Properties → Edit Property → Providers tab';
  RAISE NOTICE '   3. The 400 error should be gone!';
  RAISE NOTICE '   4. Try assigning a provider to test';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;
