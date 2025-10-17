-- Check the exact structure of property_providers_unified table
-- Run this to see what columns exist vs what we need

-- ============================================
-- SHOW ALL COLUMNS IN property_providers_unified
-- ============================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_providers_unified'
ORDER BY ordinal_position;

-- ============================================
-- SHOW FOREIGN KEY CONSTRAINTS
-- ============================================

SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  a.attname AS column_name,
  af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
  AND c.conrelid = 'public.property_providers_unified'::regclass;

-- ============================================
-- TEST: Try the exact query that the app is using
-- ============================================

-- This simulates what usePropertyProviders.ts is trying to do
SELECT
  ppu.*,
  p.provider_id,
  p.provider_name,
  p.category,
  p.provider_type,
  p.contact_person,
  p.phone_primary,
  p.phone_secondary,
  p.email,
  p.website,
  p.address_street,
  p.address_city,
  p.address_state,
  p.address_zip,
  p.customer_service_hours,
  p.emergency_contact,
  p.emergency_phone,
  p.service_area,
  p.license_number,
  p.insurance_expiry,
  p.rating,
  p.total_reviews,
  p.is_active,
  p.is_preferred
FROM public.property_providers_unified ppu
LEFT JOIN public.providers p ON p.provider_id = ppu.provider_id
LIMIT 1;
