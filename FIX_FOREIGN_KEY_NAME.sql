-- Fix Foreign Key Constraint Name
-- The app expects: property_providers_unified_provider_id_fkey
-- But it might have a different name

-- ============================================
-- STEP 1: Check current foreign key names
-- ============================================

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Find the FK constraint from property_providers_unified to providers
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE contype = 'f'
    AND conrelid = 'public.property_providers_unified'::regclass
    AND confrelid = 'public.providers'::regclass
  LIMIT 1;

  IF fk_name IS NULL THEN
    RAISE NOTICE '⚠️ No foreign key from property_providers_unified to providers found!';
  ELSE
    RAISE NOTICE '✅ Current FK name: %', fk_name;

    IF fk_name != 'property_providers_unified_provider_id_fkey' THEN
      RAISE NOTICE '⚠️ FK name does not match expected name!';
      RAISE NOTICE '   Current: %', fk_name;
      RAISE NOTICE '   Expected: property_providers_unified_provider_id_fkey';
    ELSE
      RAISE NOTICE '✅ FK name matches! The issue must be something else.';
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 2: Drop existing FK and recreate with correct name
-- ============================================

DO $$
DECLARE
  fk_rec RECORD;
BEGIN
  -- Drop all FK constraints from property_providers_unified to providers
  FOR fk_rec IN
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = 'public.property_providers_unified'::regclass
      AND confrelid = 'public.providers'::regclass
  LOOP
    EXECUTE 'ALTER TABLE public.property_providers_unified DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_rec.conname);
    RAISE NOTICE '✅ Dropped FK constraint: %', fk_rec.conname;
  END LOOP;

  -- Create the FK with the exact name Supabase expects
  ALTER TABLE public.property_providers_unified
    ADD CONSTRAINT property_providers_unified_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.providers(provider_id)
    ON DELETE CASCADE;

  RAISE NOTICE '✅ Created FK with correct name: property_providers_unified_provider_id_fkey';
END $$;

-- ============================================
-- STEP 3: Verify the fix
-- ============================================

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE contype = 'f'
    AND conrelid = 'public.property_providers_unified'::regclass
    AND confrelid = 'public.providers'::regclass
    AND conname = 'property_providers_unified_provider_id_fkey';

  IF fk_name IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ SUCCESS! Foreign key fixed!';
    RAISE NOTICE '✅ FK name: property_providers_unified_provider_id_fkey';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Next: Refresh your app and test the Providers tab';
  ELSE
    RAISE NOTICE '❌ Something went wrong - FK not created';
  END IF;
END $$;
