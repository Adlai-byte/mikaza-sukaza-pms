-- QUICK FIX: Create property_providers_unified table
-- This is a minimal, safe script that will work regardless of current state

-- ============================================
-- STEP 1: Check if table exists
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_providers_unified') THEN
    RAISE NOTICE '✅ Table property_providers_unified already exists';
  ELSE
    RAISE NOTICE '⚠️ Table property_providers_unified does NOT exist - will create it';
  END IF;
END $$;

-- ============================================
-- STEP 2: Create table only if it doesn't exist
-- ============================================

CREATE TABLE IF NOT EXISTS public.property_providers_unified (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  property_id UUID NOT NULL,

  -- Service provider assignment fields
  is_preferred_for_property BOOLEAN DEFAULT false,
  assignment_notes TEXT,

  -- Utility provider assignment fields (account details)
  account_number TEXT,
  billing_name TEXT,
  username TEXT,
  password TEXT,
  observations TEXT,

  -- Assignment metadata
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,

  UNIQUE(provider_id, property_id)
);

-- ============================================
-- STEP 3: Add foreign key constraints if they don't exist
-- ============================================

-- Add FK to providers (with a unique constraint name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_property_providers_unified_provider'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD CONSTRAINT fk_property_providers_unified_provider
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK constraint to providers';
  ELSE
    RAISE NOTICE '✅ FK constraint to providers already exists';
  END IF;
END $$;

-- Add FK to properties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_property_providers_unified_property'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD CONSTRAINT fk_property_providers_unified_property
      FOREIGN KEY (property_id) REFERENCES public.properties(property_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK constraint to properties';
  ELSE
    RAISE NOTICE '✅ FK constraint to properties already exists';
  END IF;
END $$;

-- Add FK to users (for assigned_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_property_providers_unified_user'
  ) THEN
    ALTER TABLE public.property_providers_unified
      ADD CONSTRAINT fk_property_providers_unified_user
      FOREIGN KEY (assigned_by) REFERENCES public.users(user_id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK constraint to users';
  ELSE
    RAISE NOTICE '✅ FK constraint to users already exists';
  END IF;
END $$;

-- ============================================
-- STEP 4: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ppu_provider ON public.property_providers_unified(provider_id);
CREATE INDEX IF NOT EXISTS idx_ppu_property ON public.property_providers_unified(property_id);

-- ============================================
-- STEP 5: Enable RLS
-- ============================================

ALTER TABLE public.property_providers_unified ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create RLS policies (drop and recreate)
-- ============================================

DROP POLICY IF EXISTS "Admin and Ops can manage provider assignments" ON public.property_providers_unified;

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

-- ============================================
-- STEP 7: Test the setup
-- ============================================

-- Test 1: Can we select from the table?
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.property_providers_unified;
  RAISE NOTICE '✅ Table query works! Row count: %', row_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error querying table: %', SQLERRM;
END $$;

-- Test 2: Can we do a join with providers?
DO $$
DECLARE
  join_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO join_count
  FROM public.property_providers_unified ppu
  LEFT JOIN public.providers p ON p.provider_id = ppu.provider_id;
  RAISE NOTICE '✅ Join with providers works! Count: %', join_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error joining with providers: %', SQLERRM;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE '✅ Table: property_providers_unified is ready';
  RAISE NOTICE '✅ Foreign keys configured';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Next steps:';
  RAISE NOTICE '1. Check the messages above for any errors';
  RAISE NOTICE '2. Refresh your application';
  RAISE NOTICE '3. Try the Providers tab in Property Edit';
  RAISE NOTICE '';
END $$;
