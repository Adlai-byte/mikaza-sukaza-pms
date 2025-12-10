-- ============================================
-- PASSWORD VAULT SYSTEM
-- ============================================
-- Secure password vault for storing encrypted credentials
-- Admin-only access with complete audit trail
-- Client-side encryption using AES-256-GCM

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- PASSWORD VAULT ENTRY TYPES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'password_entry_type') THEN
    CREATE TYPE password_entry_type AS ENUM (
      'property_code',
      'service_account',
      'internal_system'
    );
  END IF;
END $$;

-- ============================================
-- PASSWORD VAULT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.password_vault (
  password_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(property_id) ON DELETE SET NULL,

  -- Entry classification
  entry_type password_entry_type NOT NULL DEFAULT 'property_code',
  category TEXT NOT NULL, -- Door Code, WiFi, Gate Code, Airbnb, VRBO, etc.
  name TEXT NOT NULL, -- Entry label/title

  -- Encrypted fields (AES-256-GCM encrypted on client)
  encrypted_username TEXT,
  encrypted_password TEXT NOT NULL,
  encrypted_notes TEXT,
  encryption_iv TEXT NOT NULL, -- Base64 encoded IV for decryption

  -- Optional metadata (not encrypted)
  url TEXT,
  last_rotated_at TIMESTAMPTZ,

  -- Audit fields
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.password_vault IS 'Secure password vault with client-side encryption';
COMMENT ON COLUMN public.password_vault.encrypted_password IS 'AES-256-GCM encrypted password (client-side)';
COMMENT ON COLUMN public.password_vault.encryption_iv IS 'Base64 encoded initialization vector for AES-GCM decryption';

-- ============================================
-- PASSWORD VAULT ACCESS LOG (AUDIT TRAIL)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'password_access_action') THEN
    CREATE TYPE password_access_action AS ENUM (
      'viewed',
      'created',
      'updated',
      'deleted'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.password_vault_access_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_id UUID REFERENCES public.password_vault(password_id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,

  action password_access_action NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Store entry name for audit even if entry is deleted
  entry_name TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make access log append-only (immutable)
COMMENT ON TABLE public.password_vault_access_log IS 'Immutable audit trail for password vault access';

-- ============================================
-- MASTER PASSWORD TABLE
-- ============================================
-- Stores the hash of each user's master password for verification
-- The actual encryption key is derived client-side from the master password
CREATE TABLE IF NOT EXISTS public.password_vault_master (
  user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL, -- bcrypt hash of master password
  salt TEXT NOT NULL, -- Salt for PBKDF2 key derivation (stored for consistency)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.password_vault_master IS 'Master password verification data (hash only, never plaintext)';
COMMENT ON COLUMN public.password_vault_master.password_hash IS 'bcrypt hash for master password verification';
COMMENT ON COLUMN public.password_vault_master.salt IS 'Salt for PBKDF2 key derivation on client';

-- ============================================
-- INDEXES
-- ============================================
DO $$
BEGIN
  -- Password vault indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_vault_property') THEN
    CREATE INDEX idx_password_vault_property ON public.password_vault(property_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_vault_type') THEN
    CREATE INDEX idx_password_vault_type ON public.password_vault(entry_type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_vault_category') THEN
    CREATE INDEX idx_password_vault_category ON public.password_vault(category);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_vault_created_by') THEN
    CREATE INDEX idx_password_vault_created_by ON public.password_vault(created_by);
  END IF;

  -- Access log indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_access_log_password') THEN
    CREATE INDEX idx_password_access_log_password ON public.password_vault_access_log(password_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_access_log_user') THEN
    CREATE INDEX idx_password_access_log_user ON public.password_vault_access_log(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_access_log_created') THEN
    CREATE INDEX idx_password_access_log_created ON public.password_vault_access_log(created_at DESC);
  END IF;
END $$;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.password_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_vault_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_vault_master ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PASSWORD VAULT (ADMIN ONLY)
-- ============================================
DROP POLICY IF EXISTS "Admin can view all password entries" ON public.password_vault;
CREATE POLICY "Admin can view all password entries"
ON public.password_vault FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can create password entries" ON public.password_vault;
CREATE POLICY "Admin can create password entries"
ON public.password_vault FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can update password entries" ON public.password_vault;
CREATE POLICY "Admin can update password entries"
ON public.password_vault FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete password entries" ON public.password_vault;
CREATE POLICY "Admin can delete password entries"
ON public.password_vault FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- RLS POLICIES - ACCESS LOG (ADMIN VIEW, INSERT FOR AUDIT)
-- ============================================
DROP POLICY IF EXISTS "Admin can view access logs" ON public.password_vault_access_log;
CREATE POLICY "Admin can view access logs"
ON public.password_vault_access_log FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can create access logs" ON public.password_vault_access_log;
CREATE POLICY "Admin can create access logs"
ON public.password_vault_access_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- No UPDATE or DELETE policies - access logs are immutable

-- ============================================
-- RLS POLICIES - MASTER PASSWORD (USER OWN DATA ONLY)
-- ============================================
DROP POLICY IF EXISTS "Users can view own master password data" ON public.password_vault_master;
CREATE POLICY "Users can view own master password data"
ON public.password_vault_master FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.is_admin());

DROP POLICY IF EXISTS "Users can create own master password" ON public.password_vault_master;
CREATE POLICY "Users can create own master password"
ON public.password_vault_master FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_admin());

DROP POLICY IF EXISTS "Users can update own master password" ON public.password_vault_master;
CREATE POLICY "Users can update own master password"
ON public.password_vault_master FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND public.is_admin())
WITH CHECK (user_id = auth.uid() AND public.is_admin());

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at trigger for password_vault
CREATE OR REPLACE FUNCTION public.update_password_vault_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_password_vault_updated_at ON public.password_vault;
CREATE TRIGGER trigger_password_vault_updated_at
  BEFORE UPDATE ON public.password_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.update_password_vault_updated_at();

-- Updated_at trigger for master password
CREATE OR REPLACE FUNCTION public.update_password_vault_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_password_vault_master_updated_at ON public.password_vault_master;
CREATE TRIGGER trigger_password_vault_master_updated_at
  BEFORE UPDATE ON public.password_vault_master
  FOR EACH ROW
  EXECUTE FUNCTION public.update_password_vault_master_updated_at();

-- ============================================
-- HELPER FUNCTION: Log password access
-- ============================================
CREATE OR REPLACE FUNCTION public.log_password_access(
  p_password_id UUID,
  p_action password_access_action,
  p_entry_name TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.password_vault_access_log (
    password_id,
    user_id,
    action,
    entry_name,
    ip_address,
    user_agent
  ) VALUES (
    p_password_id,
    auth.uid(),
    p_action,
    p_entry_name,
    p_ip_address,
    p_user_agent
  ) RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_password_access TO authenticated;

COMMENT ON FUNCTION public.log_password_access IS 'Logs password vault access for audit trail';

-- ============================================
-- HELPER FUNCTION: Get password vault stats
-- ============================================
CREATE OR REPLACE FUNCTION public.get_password_vault_stats()
RETURNS TABLE (
  total_entries BIGINT,
  property_codes BIGINT,
  service_accounts BIGINT,
  internal_systems BIGINT,
  entries_this_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can get stats
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_entries,
    COUNT(*) FILTER (WHERE entry_type = 'property_code')::BIGINT AS property_codes,
    COUNT(*) FILTER (WHERE entry_type = 'service_account')::BIGINT AS service_accounts,
    COUNT(*) FILTER (WHERE entry_type = 'internal_system')::BIGINT AS internal_systems,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE))::BIGINT AS entries_this_month
  FROM public.password_vault;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_password_vault_stats TO authenticated;

COMMENT ON FUNCTION public.get_password_vault_stats IS 'Returns password vault statistics for admin dashboard';
