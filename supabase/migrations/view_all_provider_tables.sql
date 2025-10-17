-- Display data from ALL provider-related tables (old and new systems)
-- This will show utility providers, service providers, and the unified system

-- ============================================
-- UNIFIED SYSTEM (NEW)
-- ============================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;
SELECT '       UNIFIED PROVIDERS SYSTEM (NEW)' as header;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;

-- 1. All providers in unified table
SELECT
  '1. PROVIDERS (Unified Table)' as section,
  provider_id,
  provider_name,
  category,
  provider_type,
  phone_primary,
  email,
  website,
  is_active,
  created_at
FROM public.providers
ORDER BY category, provider_name;

-- 2. Property assignments in unified table
SELECT
  '2. PROPERTY_PROVIDERS_UNIFIED (Assignments)' as section,
  ppu.id,
  ppu.provider_id,
  ppu.property_id,
  p.provider_name,
  p.category,
  ppu.account_number,
  ppu.billing_name,
  ppu.is_preferred_for_property,
  ppu.assigned_at
FROM public.property_providers_unified ppu
LEFT JOIN public.providers p ON p.provider_id = ppu.provider_id
ORDER BY ppu.assigned_at DESC;

-- ============================================
-- OLD UTILITY PROVIDERS SYSTEM
-- ============================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;
SELECT '       OLD UTILITY PROVIDERS SYSTEM' as header;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;

-- Check if old utility_providers table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'utility_providers') THEN
    RAISE NOTICE '✅ utility_providers table EXISTS';
  ELSE
    RAISE NOTICE '❌ utility_providers table DOES NOT EXIST (already migrated)';
  END IF;
END $$;

-- 3. Utility providers (old table)
SELECT
  '3. UTILITY_PROVIDERS (Old Table)' as section,
  provider_id,
  provider_name,
  provider_type,
  phone_number,
  email,
  website,
  customer_service_hours,
  emergency_phone,
  is_active,
  created_at
FROM public.utility_providers
ORDER BY provider_type, provider_name;

-- 4. Utility provider assignments (old table)
SELECT
  '4. UTILITY_PROVIDER_PROPERTIES (Old Assignments)' as section,
  upp.id,
  upp.provider_id,
  upp.property_id,
  up.provider_name,
  up.provider_type,
  upp.account_number,
  upp.billing_name,
  upp.username,
  upp.observations,
  upp.assigned_at
FROM public.utility_provider_properties upp
LEFT JOIN public.utility_providers up ON up.provider_id = upp.provider_id
ORDER BY upp.assigned_at DESC;

-- ============================================
-- OLD SERVICE PROVIDERS SYSTEM
-- ============================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;
SELECT '       OLD SERVICE PROVIDERS SYSTEM' as header;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;

-- Check if old service_providers table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_providers') THEN
    RAISE NOTICE '✅ service_providers table EXISTS';
  ELSE
    RAISE NOTICE '❌ service_providers table DOES NOT EXIST (already migrated)';
  END IF;
END $$;

-- 5. Service providers (old table)
SELECT
  '5. SERVICE_PROVIDERS (Old Table)' as section,
  provider_id,
  company_name,
  service_category,
  contact_person,
  phone_primary,
  email,
  website,
  rating,
  is_active,
  is_preferred,
  created_at
FROM public.service_providers
ORDER BY service_category, company_name;

-- 6. Service provider assignments (old table)
SELECT
  '6. SERVICE_PROVIDER_PROPERTIES (Old Assignments)' as section,
  spp.id,
  spp.provider_id,
  spp.property_id,
  sp.company_name,
  sp.service_category,
  spp.is_preferred_for_property,
  spp.notes,
  spp.assigned_at
FROM public.service_provider_properties spp
LEFT JOIN public.service_providers sp ON sp.provider_id = spp.provider_id
ORDER BY spp.assigned_at DESC;

-- ============================================
-- SUMMARY COUNTS
-- ============================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;
SELECT '              SUMMARY COUNTS' as header;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider;

-- Count providers in each system
DO $$
DECLARE
  unified_count INTEGER := 0;
  utility_count INTEGER := 0;
  service_count INTEGER := 0;
  unified_util_count INTEGER := 0;
  unified_serv_count INTEGER := 0;
  unified_assign_count INTEGER := 0;
  utility_assign_count INTEGER := 0;
  service_assign_count INTEGER := 0;
BEGIN
  -- Unified system
  SELECT COUNT(*) INTO unified_count FROM public.providers;
  SELECT COUNT(*) INTO unified_util_count FROM public.providers WHERE category = 'utility';
  SELECT COUNT(*) INTO unified_serv_count FROM public.providers WHERE category = 'service';
  SELECT COUNT(*) INTO unified_assign_count FROM public.property_providers_unified;

  -- Old systems
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'utility_providers') THEN
    SELECT COUNT(*) INTO utility_count FROM public.utility_providers;
    SELECT COUNT(*) INTO utility_assign_count FROM public.utility_provider_properties;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_providers') THEN
    SELECT COUNT(*) INTO service_count FROM public.service_providers;
    SELECT COUNT(*) INTO service_assign_count FROM public.service_provider_properties;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 UNIFIED SYSTEM:';
  RAISE NOTICE '   Total providers: %', unified_count;
  RAISE NOTICE '   - Utility providers: %', unified_util_count;
  RAISE NOTICE '   - Service providers: %', unified_serv_count;
  RAISE NOTICE '   Total assignments: %', unified_assign_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 OLD SYSTEMS:';
  RAISE NOTICE '   Utility providers: %', utility_count;
  RAISE NOTICE '   Utility assignments: %', utility_assign_count;
  RAISE NOTICE '   Service providers: %', service_count;
  RAISE NOTICE '   Service assignments: %', service_assign_count;
  RAISE NOTICE '';
END $$;
