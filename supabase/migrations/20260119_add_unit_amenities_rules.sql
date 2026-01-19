-- Migration: Add per-unit amenities and rules
-- This allows multi-unit properties to have different amenities/rules per unit
-- Units without settings will inherit from property-level (via get_effective_* functions)

-- ============================================
-- 1. CREATE UNIT_AMENITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.unit_amenities (
  unit_id UUID NOT NULL REFERENCES public.units(unit_id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.amenities(amenity_id) ON DELETE CASCADE,
  PRIMARY KEY (unit_id, amenity_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.unit_amenities IS 'Per-unit amenities. If a unit has no entries, inherit from property_amenities.';

-- Index for lookups by unit
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unit_amenities_unit_id') THEN
    CREATE INDEX idx_unit_amenities_unit_id ON public.unit_amenities(unit_id);
  END IF;
END $$;

-- Index for lookups by amenity
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unit_amenities_amenity_id') THEN
    CREATE INDEX idx_unit_amenities_amenity_id ON public.unit_amenities(amenity_id);
  END IF;
END $$;

-- ============================================
-- 2. CREATE UNIT_RULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.unit_rules (
  unit_id UUID NOT NULL REFERENCES public.units(unit_id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.rules(rule_id) ON DELETE CASCADE,
  PRIMARY KEY (unit_id, rule_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.unit_rules IS 'Per-unit rules. If a unit has no entries, inherit from property_rules.';

-- Index for lookups by unit
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unit_rules_unit_id') THEN
    CREATE INDEX idx_unit_rules_unit_id ON public.unit_rules(unit_id);
  END IF;
END $$;

-- Index for lookups by rule
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unit_rules_rule_id') THEN
    CREATE INDEX idx_unit_rules_rule_id ON public.unit_rules(rule_id);
  END IF;
END $$;

-- ============================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.unit_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_rules ENABLE ROW LEVEL SECURITY;

-- Unit Amenities Policies (following unit_communication/unit_access pattern)
DROP POLICY IF EXISTS "Users can view unit amenities based on property access" ON public.unit_amenities;
CREATE POLICY "Users can view unit amenities based on property access"
ON public.unit_amenities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.property_id
    WHERE u.unit_id = unit_amenities.unit_id
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

DROP POLICY IF EXISTS "Admin and Ops can manage unit amenities" ON public.unit_amenities;
CREATE POLICY "Admin and Ops can manage unit amenities"
ON public.unit_amenities FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users usr
    WHERE usr.user_id = auth.uid()
    AND usr.user_type IN ('admin', 'ops')
  )
);

-- Unit Rules Policies
DROP POLICY IF EXISTS "Users can view unit rules based on property access" ON public.unit_rules;
CREATE POLICY "Users can view unit rules based on property access"
ON public.unit_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.property_id
    WHERE u.unit_id = unit_rules.unit_id
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

DROP POLICY IF EXISTS "Admin and Ops can manage unit rules" ON public.unit_rules;
CREATE POLICY "Admin and Ops can manage unit rules"
ON public.unit_rules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users usr
    WHERE usr.user_id = auth.uid()
    AND usr.user_type IN ('admin', 'ops')
  )
);

-- ============================================
-- 4. HELPER FUNCTIONS FOR EFFECTIVE AMENITIES/RULES
-- ============================================

-- Get effective amenities for a unit (unit-specific OR property-level if none set)
CREATE OR REPLACE FUNCTION get_effective_unit_amenities(p_unit_id UUID)
RETURNS TABLE (
  amenity_id UUID,
  amenity_name TEXT,
  source TEXT -- 'unit' or 'property'
) AS $$
DECLARE
  v_property_id UUID;
  v_has_unit_amenities BOOLEAN;
BEGIN
  -- Get the property ID for this unit
  SELECT u.property_id INTO v_property_id
  FROM public.units u
  WHERE u.unit_id = p_unit_id;

  -- Check if unit has any custom amenities
  SELECT EXISTS(
    SELECT 1 FROM public.unit_amenities ua WHERE ua.unit_id = p_unit_id
  ) INTO v_has_unit_amenities;

  IF v_has_unit_amenities THEN
    -- Return unit-specific amenities
    RETURN QUERY
    SELECT a.amenity_id, a.amenity_name, 'unit'::TEXT AS source
    FROM public.unit_amenities ua
    JOIN public.amenities a ON ua.amenity_id = a.amenity_id
    WHERE ua.unit_id = p_unit_id
    ORDER BY a.amenity_name;
  ELSE
    -- Fall back to property-level amenities
    RETURN QUERY
    SELECT a.amenity_id, a.amenity_name, 'property'::TEXT AS source
    FROM public.property_amenities pa
    JOIN public.amenities a ON pa.amenity_id = a.amenity_id
    WHERE pa.property_id = v_property_id
    ORDER BY a.amenity_name;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get effective rules for a unit (unit-specific OR property-level if none set)
CREATE OR REPLACE FUNCTION get_effective_unit_rules(p_unit_id UUID)
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  source TEXT -- 'unit' or 'property'
) AS $$
DECLARE
  v_property_id UUID;
  v_has_unit_rules BOOLEAN;
BEGIN
  -- Get the property ID for this unit
  SELECT u.property_id INTO v_property_id
  FROM public.units u
  WHERE u.unit_id = p_unit_id;

  -- Check if unit has any custom rules
  SELECT EXISTS(
    SELECT 1 FROM public.unit_rules ur WHERE ur.unit_id = p_unit_id
  ) INTO v_has_unit_rules;

  IF v_has_unit_rules THEN
    -- Return unit-specific rules
    RETURN QUERY
    SELECT r.rule_id, r.rule_name, 'unit'::TEXT AS source
    FROM public.unit_rules ur
    JOIN public.rules r ON ur.rule_id = r.rule_id
    WHERE ur.unit_id = p_unit_id
    ORDER BY r.rule_name;
  ELSE
    -- Fall back to property-level rules
    RETURN QUERY
    SELECT r.rule_id, r.rule_name, 'property'::TEXT AS source
    FROM public.property_rules pr
    JOIN public.rules r ON pr.rule_id = r.rule_id
    WHERE pr.property_id = v_property_id
    ORDER BY r.rule_name;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_amenities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_rules TO authenticated;

-- ============================================
-- SUMMARY
-- ============================================

DO $$ BEGIN
  RAISE NOTICE '=== Unit Amenities & Rules Migration Complete ===';
  RAISE NOTICE '- Created unit_amenities table with RLS';
  RAISE NOTICE '- Created unit_rules table with RLS';
  RAISE NOTICE '- Created helper functions: get_effective_unit_amenities(), get_effective_unit_rules()';
  RAISE NOTICE 'Units without custom settings will inherit from property-level amenities/rules.';
END $$;
