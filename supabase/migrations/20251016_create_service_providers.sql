-- Create service_providers table for managing contractors, vendors, and service companies
-- Date: 2025-10-16
-- Purpose: Global directory of service providers who work across multiple properties

-- ============================================
-- CREATE SERVICE_PROVIDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_providers (
  provider_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL, -- Optional link to user account
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone_primary TEXT,
  phone_secondary TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',

  -- Service Details
  service_category TEXT NOT NULL, -- e.g., 'Cleaning', 'Plumbing', 'Electrical', 'HVAC', 'Landscaping', 'Pool Service', 'Pest Control', 'Handyman', 'Painting', 'Roofing', 'Other'
  services_offered TEXT[], -- Array of specific services
  hourly_rate DECIMAL(10, 2),

  -- Business Information
  business_license TEXT,
  insurance_certificate TEXT,
  insurance_expiry DATE,
  tax_id TEXT,
  website TEXT,

  -- Rating and Status
  rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5), -- 0.00 to 5.00
  total_reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false, -- Mark as preferred vendor

  -- Payment and Terms
  payment_terms TEXT, -- e.g., 'Net 30', 'Due on completion'
  payment_methods TEXT[], -- e.g., ['Cash', 'Check', 'Credit Card', 'ACH']

  -- Additional Information
  notes TEXT,
  availability_schedule JSONB, -- Store availability as JSON
  emergency_contact TEXT,
  emergency_phone TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  last_job_date TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- CREATE SERVICE_PROVIDER_PROPERTIES JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_provider_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.service_providers(provider_id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
  is_preferred_for_property BOOLEAN DEFAULT false,
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  UNIQUE(provider_id, property_id)
);

-- ============================================
-- CREATE SERVICE_PROVIDER_DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_provider_documents (
  document_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.service_providers(provider_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- e.g., 'License', 'Insurance', 'Certificate', 'Contract', 'W9', 'Other'
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  expiry_date DATE,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- ============================================
-- CREATE SERVICE_PROVIDER_REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_provider_reviews (
  review_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.service_providers(provider_id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(property_id) ON DELETE SET NULL,
  job_id UUID, -- Reference to jobs table (will be added later)
  reviewer_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  work_quality INTEGER CHECK (work_quality >= 1 AND work_quality <= 5),
  professionalism INTEGER CHECK (professionalism >= 1 AND professionalism <= 5),
  timeliness INTEGER CHECK (timeliness >= 1 AND timeliness <= 5),
  value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
  would_recommend BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_service_providers_service_category ON public.service_providers(service_category);
CREATE INDEX IF NOT EXISTS idx_service_providers_is_active ON public.service_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_service_providers_is_preferred ON public.service_providers(is_preferred);
CREATE INDEX IF NOT EXISTS idx_service_providers_rating ON public.service_providers(rating);
CREATE INDEX IF NOT EXISTS idx_service_providers_user_id ON public.service_providers(user_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_properties_provider_id ON public.service_provider_properties(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_provider_properties_property_id ON public.service_provider_properties(property_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_documents_provider_id ON public.service_provider_documents(provider_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_reviews_provider_id ON public.service_provider_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_provider_reviews_property_id ON public.service_provider_reviews(property_id);

-- ============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_service_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_service_providers_updated_at();

-- ============================================
-- CREATE TRIGGER TO UPDATE RATING
-- ============================================

CREATE OR REPLACE FUNCTION update_service_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate average rating and total reviews for the provider
  UPDATE public.service_providers
  SET
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.service_provider_reviews
      WHERE provider_id = NEW.provider_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.service_provider_reviews
      WHERE provider_id = NEW.provider_id
    )
  WHERE provider_id = NEW.provider_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_provider_reviews_insert_trigger
  AFTER INSERT ON public.service_provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_service_provider_rating();

CREATE TRIGGER service_provider_reviews_update_trigger
  AFTER UPDATE ON public.service_provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_service_provider_rating();

CREATE TRIGGER service_provider_reviews_delete_trigger
  AFTER DELETE ON public.service_provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_service_provider_rating();

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Service Providers: Admin and Ops can manage, Providers can view their own, Customers can view active providers
CREATE POLICY "Admin and Ops can manage all service providers"
  ON public.service_providers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

CREATE POLICY "Providers can view their own profile"
  ON public.service_providers
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Customers can view active service providers"
  ON public.service_providers
  FOR SELECT
  USING (is_active = true);

-- Service Provider Properties: Admin and Ops can manage, Providers can view their assignments
CREATE POLICY "Admin and Ops can manage provider-property assignments"
  ON public.service_provider_properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

CREATE POLICY "Providers can view their property assignments"
  ON public.service_provider_properties
  FOR SELECT
  USING (
    provider_id IN (
      SELECT provider_id FROM public.service_providers
      WHERE user_id = auth.uid()
    )
  );

-- Service Provider Documents: Admin and Ops can manage, Providers can manage their own
CREATE POLICY "Admin and Ops can manage all provider documents"
  ON public.service_provider_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

CREATE POLICY "Providers can manage their own documents"
  ON public.service_provider_documents
  FOR ALL
  USING (
    provider_id IN (
      SELECT provider_id FROM public.service_providers
      WHERE user_id = auth.uid()
    )
  );

-- Service Provider Reviews: Anyone can view, Admin/Ops/Customers can create
CREATE POLICY "Anyone can view provider reviews"
  ON public.service_provider_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.service_provider_reviews
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own reviews"
  ON public.service_provider_reviews
  FOR UPDATE
  USING (reviewer_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON public.service_provider_reviews
  FOR DELETE
  USING (reviewer_id = auth.uid());

CREATE POLICY "Admin can manage all reviews"
  ON public.service_provider_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- ============================================
-- INSERT DEFAULT SERVICE CATEGORIES
-- ============================================

COMMENT ON TABLE public.service_providers IS 'Global directory of contractors, vendors, and service companies';
COMMENT ON TABLE public.service_provider_properties IS 'Junction table linking service providers to properties';
COMMENT ON TABLE public.service_provider_documents IS 'Store licenses, insurance, and other documents for service providers';
COMMENT ON TABLE public.service_provider_reviews IS 'Customer reviews and ratings for service providers';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Service Providers module created successfully';
  RAISE NOTICE '✅ Tables: service_providers, service_provider_properties, service_provider_documents, service_provider_reviews';
  RAISE NOTICE '✅ RLS policies enabled for all tables';
  RAISE NOTICE '✅ Triggers created for automatic rating updates';
  RAISE NOTICE '✅ Ready for frontend integration';
END $$;
