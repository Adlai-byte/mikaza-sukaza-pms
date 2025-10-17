-- Create utility_providers table for managing global utility company directory
-- Date: 2025-10-16
-- Purpose: Global directory of utility companies that can be assigned to properties

-- ============================================
-- CREATE UTILITY_PROVIDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.utility_providers (
  provider_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- 'Electric', 'Internet', 'Gas', 'Water', 'Cable', 'Security', 'Parking', 'Maintenance', 'Management', 'Other'
  phone_number TEXT,
  website TEXT,
  email TEXT,
  customer_service_hours TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  service_area TEXT[], -- Array of cities/regions served
  notes TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- ============================================
-- CREATE UTILITY_PROVIDER_PROPERTIES JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.utility_provider_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.utility_providers(provider_id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,

  -- Property-specific account information
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
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_utility_providers_type ON public.utility_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_utility_providers_active ON public.utility_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_utility_providers_name ON public.utility_providers(provider_name);

CREATE INDEX IF NOT EXISTS idx_utility_provider_properties_provider ON public.utility_provider_properties(provider_id);
CREATE INDEX IF NOT EXISTS idx_utility_provider_properties_property ON public.utility_provider_properties(property_id);

-- ============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_utility_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER utility_providers_updated_at
  BEFORE UPDATE ON public.utility_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_utility_providers_updated_at();

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.utility_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_provider_properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Utility Providers: Admin and Ops can manage
CREATE POLICY "Admin and Ops can manage all utility providers"
  ON public.utility_providers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Everyone can view active utility providers
CREATE POLICY "Everyone can view active utility providers"
  ON public.utility_providers
  FOR SELECT
  USING (is_active = true);

-- Utility Provider Properties: Admin and Ops can manage
CREATE POLICY "Admin and Ops can manage utility assignments"
  ON public.utility_provider_properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- ============================================
-- MIGRATE EXISTING PROPERTY_PROVIDERS DATA
-- ============================================

-- This migration will:
-- 1. Extract unique utility providers from property_providers
-- 2. Create them in utility_providers table
-- 3. Create assignments in utility_provider_properties
-- 4. Preserve all account-specific information

DO $$
DECLARE
  unique_provider RECORD;
  new_provider_id UUID;
  property_assignment RECORD;
BEGIN
  -- For each unique provider (by name and type combination)
  FOR unique_provider IN
    SELECT DISTINCT
      provider_name,
      provider_type,
      phone_number,
      website
    FROM public.property_providers
    WHERE provider_name IS NOT NULL AND provider_type IS NOT NULL
  LOOP
    -- Create global utility provider
    INSERT INTO public.utility_providers (
      provider_name,
      provider_type,
      phone_number,
      website,
      is_active,
      created_at
    )
    VALUES (
      unique_provider.provider_name,
      unique_provider.provider_type,
      unique_provider.phone_number,
      unique_provider.website,
      true,
      now()
    )
    RETURNING provider_id INTO new_provider_id;

    -- Create property assignments with account details (skip orphaned records)
    FOR property_assignment IN
      SELECT
        pp.property_id,
        pp.account_number,
        pp.billing_name,
        pp.username,
        pp.password,
        pp.observations,
        pp.created_at
      FROM public.property_providers pp
      INNER JOIN public.properties p ON pp.property_id = p.property_id
      WHERE pp.provider_name = unique_provider.provider_name
        AND pp.provider_type = unique_provider.provider_type
    LOOP
      INSERT INTO public.utility_provider_properties (
        provider_id,
        property_id,
        account_number,
        billing_name,
        username,
        password,
        observations,
        assigned_at
      )
      VALUES (
        new_provider_id,
        property_assignment.property_id,
        property_assignment.account_number,
        property_assignment.billing_name,
        property_assignment.username,
        property_assignment.password,
        property_assignment.observations,
        property_assignment.created_at
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Migrated property_providers data to utility_providers system';
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.utility_providers IS 'Global directory of utility companies';
COMMENT ON TABLE public.utility_provider_properties IS 'Junction table linking utility providers to properties with account details';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Utility Providers module created successfully';
  RAISE NOTICE '✅ Tables: utility_providers, utility_provider_properties';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Data migrated from property_providers';
  RAISE NOTICE '⚠️  Note: property_providers table preserved for backup';
END $$;
