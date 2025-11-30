-- =============================================
-- GUEST MANAGEMENT SYSTEM
-- Migration: Create guests table and link to bookings/invoices
-- Date: 2025-11-26
-- =============================================

-- =============================================
-- STEP 1: CREATE GUESTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.guests (
  guest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information (Required)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE, -- Email is the unique identifier

  -- Contact Information
  phone_primary VARCHAR(50),
  phone_secondary VARCHAR(50),

  -- Address Information
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',

  -- Preferences & Notes
  preferences JSONB DEFAULT '{}'::jsonb, -- For future extensibility (dietary, accessibility, room preferences)
  internal_notes TEXT, -- Staff notes only

  -- Computed/Cached Statistics (updated via triggers)
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0.00,
  last_booking_date DATE,

  -- Flags
  is_verified BOOLEAN DEFAULT false,
  marketing_opt_in BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- STEP 2: CREATE INDEXES
-- =============================================

-- Email index (for uniqueness and fast lookups)
CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_email ON public.guests(email);

-- Name search indexes
CREATE INDEX IF NOT EXISTS idx_guests_last_name ON public.guests(last_name);
CREATE INDEX IF NOT EXISTS idx_guests_first_name ON public.guests(first_name);
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON public.guests(first_name, last_name);

-- Phone search index
CREATE INDEX IF NOT EXISTS idx_guests_phone_primary ON public.guests(phone_primary);

-- Stats indexes for filtering
CREATE INDEX IF NOT EXISTS idx_guests_last_booking_date ON public.guests(last_booking_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_guests_total_bookings ON public.guests(total_bookings DESC);
CREATE INDEX IF NOT EXISTS idx_guests_total_spent ON public.guests(total_spent DESC);

-- Metadata indexes
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON public.guests(created_at DESC);

-- =============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin can view all guests" ON public.guests;
DROP POLICY IF EXISTS "Admin can create guests" ON public.guests;
DROP POLICY IF EXISTS "Admin can update guests" ON public.guests;
DROP POLICY IF EXISTS "Admin can delete guests" ON public.guests;

DROP POLICY IF EXISTS "Ops can view all guests" ON public.guests;
DROP POLICY IF EXISTS "Ops can create guests" ON public.guests;
DROP POLICY IF EXISTS "Ops can update guests" ON public.guests;

DROP POLICY IF EXISTS "Provider can view guests" ON public.guests;

DROP POLICY IF EXISTS "Customer can view own profile" ON public.guests;

-- Admin policies (full access)
CREATE POLICY "Admin can view all guests"
  ON public.guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can create guests"
  ON public.guests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can update guests"
  ON public.guests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can delete guests"
  ON public.guests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Ops policies (view, create, update)
CREATE POLICY "Ops can view all guests"
  ON public.guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'ops'
    )
  );

CREATE POLICY "Ops can create guests"
  ON public.guests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'ops'
    )
  );

CREATE POLICY "Ops can update guests"
  ON public.guests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'ops'
    )
  );

-- Provider policies (view only)
CREATE POLICY "Provider can view guests"
  ON public.guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'provider'
    )
  );

-- Customer policies (view own profile only - future feature)
CREATE POLICY "Customer can view own profile"
  ON public.guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'customer'
      AND users.email = guests.email
    )
  );

-- =============================================
-- STEP 4: CREATE UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guests_updated_at ON public.guests;

CREATE TRIGGER trigger_update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION update_guests_updated_at();

-- =============================================
-- STEP 5: ADD GUEST_ID TO PROPERTY_BOOKINGS
-- =============================================

-- Add guest_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'property_bookings'
    AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE public.property_bookings
    ADD COLUMN guest_id UUID REFERENCES public.guests(guest_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on guest_id
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON public.property_bookings(guest_id);

-- =============================================
-- STEP 6: ADD GUEST_ID TO INVOICES
-- =============================================

-- Add guest_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN guest_id UUID REFERENCES public.guests(guest_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on guest_id
CREATE INDEX IF NOT EXISTS idx_invoices_guest_id ON public.invoices(guest_id);

-- =============================================
-- STEP 7: ADD TABLE COMMENTS (Documentation)
-- =============================================

COMMENT ON TABLE public.guests IS 'Central guest database for tracking all property guests with history and preferences';

COMMENT ON COLUMN public.guests.email IS 'Unique email identifier - primary way to identify guests';
COMMENT ON COLUMN public.guests.preferences IS 'JSONB field for extensible guest preferences (dietary, accessibility, room type, etc.)';
COMMENT ON COLUMN public.guests.internal_notes IS 'Internal staff notes not visible to guests';
COMMENT ON COLUMN public.guests.total_bookings IS 'Cached count of total bookings - updated via trigger';
COMMENT ON COLUMN public.guests.total_spent IS 'Cached sum of all invoice amounts - updated via trigger';
COMMENT ON COLUMN public.guests.last_booking_date IS 'Date of most recent booking - updated via trigger';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Next step: Run data migration script (20251126_migrate_existing_guest_data.sql)
-- to populate guests table from existing bookings and invoices
