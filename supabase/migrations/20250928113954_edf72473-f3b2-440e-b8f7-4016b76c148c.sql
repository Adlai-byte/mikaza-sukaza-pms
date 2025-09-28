-- Create providers table for utilities (water, electricity, internet, TV, etc.)
CREATE TABLE public.property_providers (
  provider_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  provider_name TEXT NOT NULL,
  provider_type TEXT, -- e.g., 'utility', 'internet', 'tv', etc.
  phone_number TEXT,
  account_number TEXT,
  billing_name TEXT,
  website TEXT,
  username TEXT,
  password TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicles table
CREATE TABLE public.property_vehicles (
  vehicle_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  license_plate TEXT,
  vin TEXT,
  owner_name TEXT,
  registration_info TEXT,
  insurance_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial entries table
CREATE TABLE public.property_financial_entries (
  entry_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  credit DECIMAL(10,2) DEFAULT 0,
  debit DECIMAL(10,2) DEFAULT 0,
  balance DECIMAL(10,2) DEFAULT 0,
  scheduled_balance DECIMAL(10,2) DEFAULT 0,
  entry_type TEXT, -- 'credit', 'debit', 'initial', 'final'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create check lists table
CREATE TABLE public.property_checklists (
  checklist_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  checklist_name TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  due_date DATE,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.property_bookings (
  booking_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_amount DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  booking_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  payment_method TEXT, -- 'cash', 'credit_card', 'debit_card', 'deposit', 'stripe'
  special_requests TEXT,
  number_of_guests INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking rates table
CREATE TABLE public.property_booking_rates (
  rate_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  holiday_rate DECIMAL(10,2) DEFAULT 0,
  high_season_rate DECIMAL(10,2) DEFAULT 0,
  medium_season_rate DECIMAL(10,2) DEFAULT 0,
  low_season_rate DECIMAL(10,2) DEFAULT 0,
  extra_guest_price DECIMAL(10,2) DEFAULT 0,
  pm_commission DECIMAL(5,2) DEFAULT 0, -- percentage
  cash_payment BOOLEAN DEFAULT false,
  credit_card_payment BOOLEAN DEFAULT false,
  debit_card_payment BOOLEAN DEFAULT false,
  deposit_payment BOOLEAN DEFAULT false,
  stripe_payment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notes table
CREATE TABLE public.property_notes (
  note_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  note_title TEXT,
  note_content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- 'general', 'maintenance', 'guest', 'important'
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create QR codes table
CREATE TABLE public.property_qr_codes (
  qr_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  qr_type TEXT NOT NULL, -- 'unit', 'vehicle', 'mail', etc.
  qr_code_data TEXT NOT NULL, -- the encoded data
  qr_code_image_url TEXT, -- URL to the generated QR code image
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.property_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_booking_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all new tables
CREATE POLICY "Allow all operations on property_providers" ON public.property_providers FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_vehicles" ON public.property_vehicles FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_financial_entries" ON public.property_financial_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_checklists" ON public.property_checklists FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_bookings" ON public.property_bookings FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_booking_rates" ON public.property_booking_rates FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_notes" ON public.property_notes FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_qr_codes" ON public.property_qr_codes FOR ALL USING (true);

-- Add triggers for updated_at columns
CREATE TRIGGER update_property_providers_updated_at
  BEFORE UPDATE ON public.property_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_vehicles_updated_at
  BEFORE UPDATE ON public.property_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_financial_entries_updated_at
  BEFORE UPDATE ON public.property_financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_checklists_updated_at
  BEFORE UPDATE ON public.property_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_bookings_updated_at
  BEFORE UPDATE ON public.property_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_booking_rates_updated_at
  BEFORE UPDATE ON public.property_booking_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_notes_updated_at
  BEFORE UPDATE ON public.property_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();