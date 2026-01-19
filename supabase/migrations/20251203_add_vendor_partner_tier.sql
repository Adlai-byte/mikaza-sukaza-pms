-- =====================================================
-- Add Partner Tier to Providers
-- =====================================================
-- Adds partner tier levels for vendor classification:
-- - Regular (default)
-- - Partner
-- - Gold Partner
-- - Platinum Partner
-- =====================================================

-- 1. Create partner_tier enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_tier_enum') THEN
    CREATE TYPE partner_tier_enum AS ENUM (
      'regular',
      'partner',
      'gold_partner',
      'platinum_partner'
    );
  END IF;
END $$;

-- 2. Add partner_tier column to providers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'partner_tier'
  ) THEN
    ALTER TABLE providers
    ADD COLUMN partner_tier partner_tier_enum DEFAULT 'regular';
  END IF;
END $$;

-- 3. Create index for filtering by partner tier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_providers_partner_tier') THEN
    CREATE INDEX idx_providers_partner_tier ON providers(partner_tier);
  END IF;
END $$;

-- 4. Add comment
COMMENT ON COLUMN providers.partner_tier IS 'Partner classification level: regular, partner, gold_partner, platinum_partner';
