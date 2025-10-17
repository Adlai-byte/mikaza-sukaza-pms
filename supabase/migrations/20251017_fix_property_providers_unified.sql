-- Fix Property Providers Unified Table
-- Date: 2025-10-17
-- Purpose: Create property_providers_unified table if it doesn't exist (handles partial migration)

-- ============================================
-- CREATE PROPERTY_PROVIDERS_UNIFIED TABLE IF NOT EXISTS
-- ============================================

-- Check if the table already exists with a different name
DO $$
BEGIN
  -- If property_providers_new exists but property_providers_unified doesn't, rename it
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_providers_new')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_providers_unified')
  THEN
    ALTER TABLE public.property_providers_new RENAME TO property_providers_unified;
    RAISE NOTICE '✅ Renamed property_providers_new to property_providers_unified';
  END IF;
END $$;

-- Create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.property_providers_unified (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,

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
  assigned_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,

  UNIQUE(provider_id, property_id)
);

-- ============================================
-- CREATE INDEXES IF NOT EXISTS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_property_providers_unified_provider
  ON public.property_providers_unified(provider_id);

CREATE INDEX IF NOT EXISTS idx_property_providers_unified_property
  ON public.property_providers_unified(property_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.property_providers_unified ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES (DROP IF EXISTS FIRST)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin and Ops can manage provider assignments" ON public.property_providers_unified;

-- Property assignments: Admin and Ops can manage
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
-- MIGRATE DATA FROM OLD TABLES IF NEEDED
-- ============================================

DO $$
DECLARE
  service_assignment_count INTEGER := 0;
  utility_assignment_count INTEGER := 0;
BEGIN
  -- Check if we need to migrate service provider assignments
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_provider_properties')
     AND NOT EXISTS (
       SELECT 1 FROM public.property_providers_unified
       WHERE provider_id IN (SELECT provider_id FROM public.providers WHERE category = 'service')
       LIMIT 1
     )
  THEN
    -- Migrate Service Provider Assignments
    INSERT INTO public.property_providers_unified (
      id,
      provider_id,
      property_id,
      is_preferred_for_property,
      assignment_notes,
      assigned_at,
      assigned_by
    )
    SELECT
      spp.id,
      spp.provider_id,
      spp.property_id,
      COALESCE(spp.is_preferred_for_property, false),
      spp.notes,
      spp.assigned_at,
      spp.assigned_by
    FROM public.service_provider_properties spp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.property_providers_unified ppu
      WHERE ppu.provider_id = spp.provider_id
      AND ppu.property_id = spp.property_id
    );

    GET DIAGNOSTICS service_assignment_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % service assignments', service_assignment_count;
  END IF;

  -- Check if we need to migrate utility provider assignments
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'utility_provider_properties')
     AND NOT EXISTS (
       SELECT 1 FROM public.property_providers_unified
       WHERE provider_id IN (SELECT provider_id FROM public.providers WHERE category = 'utility')
       LIMIT 1
     )
  THEN
    -- Migrate Utility Provider Assignments
    INSERT INTO public.property_providers_unified (
      id,
      provider_id,
      property_id,
      account_number,
      billing_name,
      username,
      password,
      observations,
      assigned_at,
      assigned_by
    )
    SELECT
      upp.id,
      upp.provider_id,
      upp.property_id,
      upp.account_number,
      upp.billing_name,
      upp.username,
      upp.password,
      upp.observations,
      upp.assigned_at,
      upp.assigned_by
    FROM public.utility_provider_properties upp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.property_providers_unified ppu
      WHERE ppu.provider_id = upp.provider_id
      AND ppu.property_id = upp.property_id
    );

    GET DIAGNOSTICS utility_assignment_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % utility assignments', utility_assignment_count;
  END IF;

  IF service_assignment_count = 0 AND utility_assignment_count = 0 THEN
    RAISE NOTICE '✅ No new assignments to migrate (already migrated or no old data)';
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.property_providers_unified IS 'Junction table linking providers to properties with assignment details';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ property_providers_unified table is ready';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '✅ You can now use the providers assignment module in property edit';
END $$;
