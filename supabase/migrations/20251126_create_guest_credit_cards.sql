-- =============================================
-- GUEST CREDIT CARDS TABLE
-- Stores credit card information for guests
-- =============================================

-- Create guest_credit_cards table
CREATE TABLE IF NOT EXISTS public.guest_credit_cards (
  guest_credit_card_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guests(guest_id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('visa', 'mastercard', 'amex', 'discover')),
  cardholder_name VARCHAR(255) NOT NULL,
  card_number VARCHAR(20) NOT NULL, -- Store encrypted or last 4 digits only in production
  due_date VARCHAR(10) NOT NULL, -- MM/YY format
  security_code VARCHAR(4) NOT NULL, -- CVV - should be encrypted in production
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guest_credit_cards_guest_id ON public.guest_credit_cards(guest_id);

-- Enable RLS
ALTER TABLE public.guest_credit_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin can manage all guest credit cards" ON public.guest_credit_cards;
DROP POLICY IF EXISTS "Ops can view and manage guest credit cards" ON public.guest_credit_cards;
DROP POLICY IF EXISTS "Provider can view guest credit cards" ON public.guest_credit_cards;

-- RLS Policies

-- Admin full access
CREATE POLICY "Admin can manage all guest credit cards"
  ON public.guest_credit_cards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Ops can view and manage
CREATE POLICY "Ops can view and manage guest credit cards"
  ON public.guest_credit_cards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Provider can view only
CREATE POLICY "Provider can view guest credit cards"
  ON public.guest_credit_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'provider'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_guest_credit_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guest_credit_cards_updated_at ON public.guest_credit_cards;
CREATE TRIGGER trigger_update_guest_credit_cards_updated_at
  BEFORE UPDATE ON public.guest_credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_credit_cards_updated_at();

-- Add comment
COMMENT ON TABLE public.guest_credit_cards IS 'Stores credit card information for guests. Note: In production, card numbers and CVV should be encrypted or tokenized.';
