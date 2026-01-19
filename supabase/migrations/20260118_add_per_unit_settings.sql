-- Migration: Add per-unit capacity, communication, and access settings
-- This allows multi-unit properties to have different WiFi, door codes, and capacity per unit
-- Units without settings will inherit from property-level (NULL = inherit from property)

-- ============================================
-- 1. ADD CAPACITY FIELDS TO UNITS TABLE
-- ============================================

ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.units.capacity IS 'Standard guest capacity for this unit. NULL means inherit from property.';
COMMENT ON COLUMN public.units.max_capacity IS 'Maximum guest capacity for this unit. NULL means inherit from property.';

-- Index for capacity filtering
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_units_capacity') THEN
    CREATE INDEX idx_units_capacity ON public.units(capacity) WHERE capacity IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 2. CREATE UNIT_COMMUNICATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.unit_communication (
  comm_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(unit_id) ON DELETE CASCADE,
  phone_number TEXT,
  wifi_name TEXT,
  wifi_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unit_communication_unit_id_unique UNIQUE(unit_id)
);

COMMENT ON TABLE public.unit_communication IS 'Per-unit WiFi and communication settings. If a unit has no entry, inherit from property_communication.';

-- Indexes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unit_communication_unit_id') THEN
    CREATE INDEX idx_unit_communication_unit_id ON public.unit_communication(unit_id);
  END IF;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_unit_communication_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unit_communication_updated_at ON public.unit_communication;
CREATE TRIGGER trigger_unit_communication_updated_at
  BEFORE UPDATE ON public.unit_communication
  FOR EACH ROW
  EXECUTE FUNCTION update_unit_communication_updated_at();

-- ============================================
-- 3. CREATE UNIT_ACCESS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.unit_access (
  access_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(unit_id) ON DELETE CASCADE,
  gate_code TEXT,
  door_lock_password TEXT,
  alarm_passcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unit_access_unit_id_unique UNIQUE(unit_id)
);

COMMENT ON TABLE public.unit_access IS 'Per-unit access codes and passwords. If a unit has no entry, inherit from property_access.';

-- Indexes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unit_access_unit_id') THEN
    CREATE INDEX idx_unit_access_unit_id ON public.unit_access(unit_id);
  END IF;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_unit_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unit_access_updated_at ON public.unit_access;
CREATE TRIGGER trigger_unit_access_updated_at
  BEFORE UPDATE ON public.unit_access
  FOR EACH ROW
  EXECUTE FUNCTION update_unit_access_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.unit_communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_access ENABLE ROW LEVEL SECURITY;

-- Unit Communication Policies
DROP POLICY IF EXISTS "Users can view unit communication based on property access" ON public.unit_communication;
CREATE POLICY "Users can view unit communication based on property access"
ON public.unit_communication FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.property_id
    WHERE u.unit_id = unit_communication.unit_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users usr
        WHERE usr.user_id = auth.uid()
        AND usr.user_type IN ('admin', 'ops')
      )
    )
  )
);

DROP POLICY IF EXISTS "Admin and Ops can manage unit communication" ON public.unit_communication;
CREATE POLICY "Admin and Ops can manage unit communication"
ON public.unit_communication FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users usr
    WHERE usr.user_id = auth.uid()
    AND usr.user_type IN ('admin', 'ops')
  )
);

-- Unit Access Policies
DROP POLICY IF EXISTS "Users can view unit access based on property access" ON public.unit_access;
CREATE POLICY "Users can view unit access based on property access"
ON public.unit_access FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.property_id
    WHERE u.unit_id = unit_access.unit_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users usr
        WHERE usr.user_id = auth.uid()
        AND usr.user_type IN ('admin', 'ops')
      )
    )
  )
);

DROP POLICY IF EXISTS "Admin and Ops can manage unit access" ON public.unit_access;
CREATE POLICY "Admin and Ops can manage unit access"
ON public.unit_access FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users usr
    WHERE usr.user_id = auth.uid()
    AND usr.user_type IN ('admin', 'ops')
  )
);

-- ============================================
-- 5. HELPER FUNCTION TO GET EFFECTIVE UNIT SETTINGS
-- ============================================

-- Get effective communication settings for a unit (with property fallback)
CREATE OR REPLACE FUNCTION get_effective_unit_communication(p_unit_id UUID)
RETURNS TABLE (
  wifi_name TEXT,
  wifi_password TEXT,
  phone_number TEXT,
  source TEXT -- 'unit' or 'property'
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(uc.wifi_name, pc.wifi_name) AS wifi_name,
    COALESCE(uc.wifi_password, pc.wifi_password) AS wifi_password,
    COALESCE(uc.phone_number, pc.phone_number) AS phone_number,
    CASE
      WHEN uc.comm_id IS NOT NULL THEN 'unit'::TEXT
      ELSE 'property'::TEXT
    END AS source
  FROM public.units u
  LEFT JOIN public.unit_communication uc ON u.unit_id = uc.unit_id
  LEFT JOIN public.property_communication pc ON u.property_id = pc.property_id
  WHERE u.unit_id = p_unit_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get effective access settings for a unit (with property fallback)
CREATE OR REPLACE FUNCTION get_effective_unit_access(p_unit_id UUID)
RETURNS TABLE (
  gate_code TEXT,
  door_lock_password TEXT,
  alarm_passcode TEXT,
  source TEXT -- 'unit' or 'property'
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ua.gate_code, pa.gate_code) AS gate_code,
    COALESCE(ua.door_lock_password, pa.door_lock_password) AS door_lock_password,
    COALESCE(ua.alarm_passcode, pa.alarm_passcode) AS alarm_passcode,
    CASE
      WHEN ua.access_id IS NOT NULL THEN 'unit'::TEXT
      ELSE 'property'::TEXT
    END AS source
  FROM public.units u
  LEFT JOIN public.unit_access ua ON u.unit_id = ua.unit_id
  LEFT JOIN public.property_access pa ON u.property_id = pa.property_id
  WHERE u.unit_id = p_unit_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_communication TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_access TO authenticated;

-- ============================================
-- SUMMARY
-- ============================================

DO $$ BEGIN
  RAISE NOTICE '=== Per-Unit Settings Migration Complete ===';
  RAISE NOTICE '- Added capacity and max_capacity columns to units table';
  RAISE NOTICE '- Created unit_communication table with RLS';
  RAISE NOTICE '- Created unit_access table with RLS';
  RAISE NOTICE '- Created helper functions: get_effective_unit_communication(), get_effective_unit_access()';
  RAISE NOTICE 'Units without settings will inherit from property-level settings.';
END $$;
