-- Create Properties table
CREATE TABLE public.properties (
    property_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_booking BOOLEAN NOT NULL DEFAULT false,
    is_pets_allowed BOOLEAN NOT NULL DEFAULT false,
    property_type TEXT NOT NULL,
    size_sqf INTEGER,
    capacity INTEGER,
    max_capacity INTEGER,
    num_bedrooms INTEGER,
    num_bathrooms INTEGER,
    num_half_bath INTEGER,
    num_wcs INTEGER,
    num_kitchens INTEGER,
    num_living_rooms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Property_Location table
CREATE TABLE public.property_location (
    location_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Property_Communication table
CREATE TABLE public.property_communication (
    comm_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    phone_number TEXT,
    wifi_name TEXT,
    wifi_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Property_Access table
CREATE TABLE public.property_access (
    access_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    gate_code TEXT,
    door_lock_password TEXT,
    alarm_passcode TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Property_Extras table
CREATE TABLE public.property_extras (
    extras_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    storage_number TEXT,
    storage_code TEXT,
    front_desk TEXT,
    garage_number TEXT,
    mailing_box TEXT,
    pool_access_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Units table
CREATE TABLE public.units (
    unit_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    property_name TEXT,
    license_number TEXT,
    folio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Amenities master table
CREATE TABLE public.amenities (
    amenity_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    amenity_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Property_Amenities join table
CREATE TABLE public.property_amenities (
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(amenity_id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, amenity_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Rules master table
CREATE TABLE public.rules (
    rule_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Property_Rules join table
CREATE TABLE public.property_rules (
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.rules(rule_id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, rule_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Property Images table
CREATE TABLE public.property_images (
    image_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_title TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (Allow all operations for now - can be refined later)
CREATE POLICY "Allow all operations on properties" ON public.properties FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_location" ON public.property_location FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_communication" ON public.property_communication FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_access" ON public.property_access FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_extras" ON public.property_extras FOR ALL USING (true);
CREATE POLICY "Allow all operations on units" ON public.units FOR ALL USING (true);
CREATE POLICY "Allow all operations on amenities" ON public.amenities FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_amenities" ON public.property_amenities FOR ALL USING (true);
CREATE POLICY "Allow all operations on rules" ON public.rules FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_rules" ON public.property_rules FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_images" ON public.property_images FOR ALL USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_location_updated_at
    BEFORE UPDATE ON public.property_location
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_communication_updated_at
    BEFORE UPDATE ON public.property_communication
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_access_updated_at
    BEFORE UPDATE ON public.property_access
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_extras_updated_at
    BEFORE UPDATE ON public.property_extras
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at
    BEFORE UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_images_updated_at
    BEFORE UPDATE ON public.property_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default amenities
INSERT INTO public.amenities (amenity_name) VALUES
    ('Private Pool'),
    ('Jacuzzi'),
    ('Barbeque Grill'),
    ('Communal Pool'),
    ('Gym/Fitness Center'),
    ('WiFi'),
    ('Air Conditioning'),
    ('Heating'),
    ('Parking'),
    ('Laundry'),
    ('Kitchen'),
    ('Balcony/Terrace'),
    ('Garden'),
    ('Security System'),
    ('Elevator');

-- Insert default rules
INSERT INTO public.rules (rule_name) VALUES
    ('No Smoking'),
    ('No Pets'),
    ('No Parties'),
    ('Quiet Hours 10PM-8AM'),
    ('Maximum Occupancy Enforced'),
    ('Check-in after 3PM'),
    ('Check-out before 11AM'),
    ('No Outside Guests'),
    ('Shoes Off Inside'),
    ('No Food in Bedrooms');