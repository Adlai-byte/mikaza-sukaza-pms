-- Display all data in providers-related tables
-- Run this to see what data currently exists

-- ============================================
-- 1. PROVIDERS TABLE - All providers
-- ============================================

SELECT
  '=== PROVIDERS TABLE ===' as section;

SELECT
  provider_id,
  provider_name,
  category,
  provider_type,
  contact_person,
  phone_primary,
  email,
  website,
  is_active,
  is_preferred,
  created_at
FROM public.providers
ORDER BY category, provider_name;

-- ============================================
-- 2. PROVIDERS BY CATEGORY - Summary
-- ============================================

SELECT
  '=== PROVIDERS BY CATEGORY ===' as section;

SELECT
  category,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_preferred = true) as preferred_count
FROM public.providers
GROUP BY category
ORDER BY category;

-- ============================================
-- 3. PROPERTY_PROVIDERS_UNIFIED - All assignments
-- ============================================

SELECT
  '=== PROPERTY PROVIDER ASSIGNMENTS ===' as section;

SELECT
  ppu.id,
  ppu.property_id,
  ppu.provider_id,
  p.provider_name,
  p.category,
  p.provider_type,
  ppu.is_preferred_for_property,
  ppu.account_number,
  ppu.billing_name,
  ppu.assignment_notes,
  ppu.observations,
  ppu.assigned_at
FROM public.property_providers_unified ppu
LEFT JOIN public.providers p ON p.provider_id = ppu.provider_id
ORDER BY ppu.assigned_at DESC;

-- ============================================
-- 4. ASSIGNMENTS BY CATEGORY - Summary
-- ============================================

SELECT
  '=== ASSIGNMENTS BY CATEGORY ===' as section;

SELECT
  p.category,
  COUNT(*) as assignment_count,
  COUNT(DISTINCT ppu.property_id) as properties_count,
  COUNT(DISTINCT ppu.provider_id) as providers_count
FROM public.property_providers_unified ppu
LEFT JOIN public.providers p ON p.provider_id = ppu.provider_id
GROUP BY p.category
ORDER BY p.category;

-- ============================================
-- 5. DETAILED VIEW - Join everything
-- ============================================

SELECT
  '=== FULL ASSIGNMENT DETAILS ===' as section;

SELECT
  ppu.id as assignment_id,
  prop.property_name,
  prop.property_id,
  prov.provider_name,
  prov.category as provider_category,
  prov.provider_type,
  prov.phone_primary as provider_phone,
  prov.email as provider_email,
  ppu.account_number,
  ppu.billing_name,
  ppu.username,
  ppu.is_preferred_for_property,
  ppu.assignment_notes,
  ppu.observations,
  ppu.assigned_at,
  u.first_name || ' ' || u.last_name as assigned_by_name
FROM public.property_providers_unified ppu
LEFT JOIN public.providers prov ON prov.provider_id = ppu.provider_id
LEFT JOIN public.properties prop ON prop.property_id = ppu.property_id
LEFT JOIN public.users u ON u.user_id = ppu.assigned_by
ORDER BY ppu.assigned_at DESC;

-- ============================================
-- 6. UTILITY PROVIDERS ONLY
-- ============================================

SELECT
  '=== UTILITY PROVIDERS ===' as section;

SELECT
  provider_id,
  provider_name,
  provider_type,
  phone_primary,
  email,
  website,
  customer_service_hours,
  emergency_phone,
  is_active
FROM public.providers
WHERE category = 'utility'
ORDER BY provider_type, provider_name;

-- ============================================
-- 7. SERVICE PROVIDERS ONLY
-- ============================================

SELECT
  '=== SERVICE PROVIDERS ===' as section;

SELECT
  provider_id,
  provider_name,
  provider_type,
  contact_person,
  phone_primary,
  email,
  address_street,
  address_city,
  address_state,
  license_number,
  rating,
  total_reviews,
  is_active,
  is_preferred
FROM public.providers
WHERE category = 'service'
ORDER BY provider_type, provider_name;
