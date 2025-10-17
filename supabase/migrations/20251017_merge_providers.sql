-- Merge Service Providers and Utility Providers into Unified Providers System
-- Date: 2025-10-17
-- Purpose: Consolidate service_providers and utility_providers into a single providers table

-- ============================================
-- CREATE UNIFIED PROVIDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.providers (
  provider_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic Information
  provider_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('service', 'utility')),
  provider_type TEXT NOT NULL, -- Plumbing, Electric, Internet, etc.

  -- Contact Information (unified)
  contact_person TEXT, -- For service providers
  phone_primary TEXT,
  phone_secondary TEXT, -- For service providers
  email TEXT,
  website TEXT,

  -- Address (for service providers)
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- Utility-specific fields
  customer_service_hours TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  service_area TEXT[], -- Array of cities/regions served

  -- Service provider-specific fields
  license_number TEXT,
  insurance_expiry DATE,

  -- Ratings & Reviews (for service providers)
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false, -- Global preferred status for services

  -- General notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- ============================================
-- CREATE UNIFIED PROPERTY_PROVIDERS JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.property_providers_new (
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
-- CREATE SUPPORTING TABLES
-- ============================================

-- Provider Documents (from service_providers system)
CREATE TABLE IF NOT EXISTS public.provider_documents (
  document_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- license, insurance, certification, contract
  document_name TEXT NOT NULL,
  document_url TEXT,
  issue_date DATE,
  expiry_date DATE,
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- Provider Reviews (from service_providers system)
CREATE TABLE IF NOT EXISTS public.provider_reviews (
  review_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(property_id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  work_completed TEXT,
  would_recommend BOOLEAN DEFAULT true,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewer_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_providers_category ON public.providers(category);
CREATE INDEX IF NOT EXISTS idx_providers_type ON public.providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_active ON public.providers(is_active);
CREATE INDEX IF NOT EXISTS idx_providers_name ON public.providers(provider_name);
CREATE INDEX IF NOT EXISTS idx_providers_preferred ON public.providers(is_preferred);

CREATE INDEX IF NOT EXISTS idx_property_providers_new_provider ON public.property_providers_new(provider_id);
CREATE INDEX IF NOT EXISTS idx_property_providers_new_property ON public.property_providers_new(property_id);

CREATE INDEX IF NOT EXISTS idx_provider_documents_provider ON public.provider_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider ON public.provider_reviews(provider_id);

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION update_providers_updated_at();

-- Auto-calculate ratings trigger
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.providers
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.provider_reviews
      WHERE provider_id = NEW.provider_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.provider_reviews
      WHERE provider_id = NEW.provider_id
    )
  WHERE provider_id = NEW.provider_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER provider_reviews_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON public.provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_providers_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Providers: Admin and Ops can manage
CREATE POLICY "Admin and Ops can manage all providers"
  ON public.providers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Everyone can view active providers
CREATE POLICY "Everyone can view active providers"
  ON public.providers
  FOR SELECT
  USING (is_active = true);

-- Property assignments: Admin and Ops can manage
CREATE POLICY "Admin and Ops can manage provider assignments"
  ON public.property_providers_new
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Documents: Admin and Ops can manage
CREATE POLICY "Admin and Ops can manage provider documents"
  ON public.provider_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Reviews: Admin and Ops can manage
CREATE POLICY "Admin and Ops can manage provider reviews"
  ON public.provider_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- ============================================
-- MIGRATE DATA FROM EXISTING TABLES
-- ============================================

DO $$
DECLARE
  service_count INTEGER := 0;
  utility_count INTEGER := 0;
  service_assignment_count INTEGER := 0;
  utility_assignment_count INTEGER := 0;
BEGIN
  -- Migrate Service Providers
  INSERT INTO public.providers (
    provider_id,
    provider_name,
    category,
    provider_type,
    contact_person,
    phone_primary,
    phone_secondary,
    email,
    website,
    address_street,
    address_city,
    address_state,
    address_zip,
    license_number,
    insurance_expiry,
    rating,
    total_reviews,
    is_active,
    is_preferred,
    notes,
    created_at,
    updated_at,
    created_by
  )
  SELECT
    provider_id,
    company_name,
    'service',
    service_category,
    contact_person,
    phone_primary,
    phone_secondary,
    email,
    website,
    address,  -- Map from 'address' to 'address_street'
    city,     -- Map from 'city' to 'address_city'
    state,    -- Map from 'state' to 'address_state'
    zip,      -- Map from 'zip' to 'address_zip'
    business_license,  -- Map from 'business_license' to 'license_number'
    insurance_expiry,
    COALESCE(rating, 0.00),
    COALESCE(total_reviews, 0),
    COALESCE(is_active, true),
    COALESCE(is_preferred, false),
    notes,
    created_at,
    updated_at,
    created_by
  FROM public.service_providers;

  GET DIAGNOSTICS service_count = ROW_COUNT;

  -- Migrate Utility Providers
  INSERT INTO public.providers (
    provider_id,
    provider_name,
    category,
    provider_type,
    phone_primary,
    email,
    website,
    customer_service_hours,
    emergency_contact,
    emergency_phone,
    service_area,
    is_active,
    notes,
    created_at,
    updated_at,
    created_by
  )
  SELECT
    provider_id,
    provider_name,
    'utility',
    provider_type,
    phone_number,
    email,
    website,
    customer_service_hours,
    emergency_contact,
    emergency_phone,
    service_area,
    COALESCE(is_active, true),
    notes,
    created_at,
    updated_at,
    created_by
  FROM public.utility_providers;

  GET DIAGNOSTICS utility_count = ROW_COUNT;

  -- Migrate Service Provider Assignments
  INSERT INTO public.property_providers_new (
    id,
    provider_id,
    property_id,
    is_preferred_for_property,
    assignment_notes,
    assigned_at,
    assigned_by
  )
  SELECT
    id,
    provider_id,
    property_id,
    COALESCE(is_preferred_for_property, false),
    notes,
    assigned_at,
    assigned_by
  FROM public.service_provider_properties;

  GET DIAGNOSTICS service_assignment_count = ROW_COUNT;

  -- Migrate Utility Provider Assignments
  INSERT INTO public.property_providers_new (
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
  FROM public.utility_provider_properties;

  GET DIAGNOSTICS utility_assignment_count = ROW_COUNT;

  -- Migrate Service Provider Documents
  INSERT INTO public.provider_documents (
    document_id,
    provider_id,
    document_type,
    document_name,
    document_url,
    expiry_date,
    notes,
    uploaded_at,
    uploaded_by
  )
  SELECT
    document_id,
    provider_id,
    document_type,
    document_name,
    document_url,
    expiry_date,
    NULL as notes,  -- Old table doesn't have notes column
    uploaded_at,
    uploaded_by
  FROM public.service_provider_documents;

  -- Migrate Service Provider Reviews
  INSERT INTO public.provider_reviews (
    review_id,
    provider_id,
    property_id,
    rating,
    review_text,
    would_recommend,
    reviewed_at,
    reviewer_id
  )
  SELECT
    review_id,
    provider_id,
    property_id,
    rating,
    review_text,
    COALESCE(would_recommend, true) as would_recommend,
    created_at as reviewed_at,  -- Map created_at to reviewed_at
    reviewer_id
  FROM public.service_provider_reviews;

  RAISE NOTICE '✅ Migrated % service providers', service_count;
  RAISE NOTICE '✅ Migrated % utility providers', utility_count;
  RAISE NOTICE '✅ Migrated % service assignments', service_assignment_count;
  RAISE NOTICE '✅ Migrated % utility assignments', utility_assignment_count;
END $$;

-- ============================================
-- DROP OLD TABLES (Comment out if you want to keep backups)
-- ============================================

-- DROP TABLE IF EXISTS public.service_provider_reviews CASCADE;
-- DROP TABLE IF EXISTS public.service_provider_documents CASCADE;
-- DROP TABLE IF EXISTS public.service_provider_properties CASCADE;
-- DROP TABLE IF EXISTS public.service_providers CASCADE;
-- DROP TABLE IF EXISTS public.utility_provider_properties CASCADE;
-- DROP TABLE IF EXISTS public.utility_providers CASCADE;

-- Rename old property_providers if it exists
-- ALTER TABLE IF EXISTS public.property_providers RENAME TO property_providers_old_backup;

-- Rename new table to final name
ALTER TABLE public.property_providers_new RENAME TO property_providers_unified;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.providers IS 'Unified directory of all providers (services and utilities)';
COMMENT ON TABLE public.property_providers_unified IS 'Junction table linking providers to properties with assignment details';
COMMENT ON TABLE public.provider_documents IS 'Documents for providers (licenses, insurance, etc.)';
COMMENT ON TABLE public.provider_reviews IS 'Reviews and ratings for service providers';

COMMENT ON COLUMN public.providers.category IS 'Provider category: service (contractors) or utility (companies)';
COMMENT ON COLUMN public.providers.provider_type IS 'Specific type: Plumbing, Electric, Internet, etc.';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Unified Providers system created successfully';
  RAISE NOTICE '✅ Tables: providers, property_providers_unified, provider_documents, provider_reviews';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Data migrated from service_providers and utility_providers';
  RAISE NOTICE '⚠️  Note: Old tables preserved for backup (can be dropped manually)';
END $$;
