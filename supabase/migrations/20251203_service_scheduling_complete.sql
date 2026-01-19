-- =====================================================
-- Service Scheduling System - Complete Migration
-- =====================================================
-- Creates service scheduling system with legacy fields
-- for vendor/partner management matching MIKAZA SUKAZA
-- =====================================================

-- =====================================================
-- PART 1: ENUMS
-- =====================================================

-- Service type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_type_enum') THEN
    CREATE TYPE service_type_enum AS ENUM (
      'cleaning',
      'deep_cleaning',
      'maintenance',
      'pool_service',
      'landscaping',
      'pest_control',
      'hvac',
      'plumbing',
      'electrical',
      'inspection',
      'turnover',
      'laundry',
      'guest_services',
      'security',
      'other'
    );
  END IF;
END $$;

-- Recurrence frequency enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_frequency_enum') THEN
    CREATE TYPE recurrence_frequency_enum AS ENUM (
      'daily',
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
      'custom'
    );
  END IF;
END $$;

-- Schedule status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status_enum') THEN
    CREATE TYPE schedule_status_enum AS ENUM (
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show'
    );
  END IF;
END $$;

-- Partner payment status enum (legacy field)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_payment_status_enum') THEN
    CREATE TYPE partner_payment_status_enum AS ENUM (
      'pending',
      'waiting',
      'paid',
      'partial',
      'overdue'
    );
  END IF;
END $$;

-- Allocation status enum (legacy field)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allocation_status_enum') THEN
    CREATE TYPE allocation_status_enum AS ENUM (
      'unassigned',
      'assigned',
      'accepted',
      'declined',
      'reassigned'
    );
  END IF;
END $$;

-- =====================================================
-- PART 2: CATEGORY TABLES (must be created before scheduled_services)
-- =====================================================

-- Service categories table
CREATE TABLE IF NOT EXISTS service_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(50) UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service types catalog table
CREATE TABLE IF NOT EXISTS service_types_catalog (
  service_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES service_categories(category_id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL,
  service_code VARCHAR(50),
  description TEXT,
  default_duration_minutes INTEGER DEFAULT 60,
  default_cost DECIMAL(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, service_code)
);

-- =====================================================
-- PART 3: RECURRENCE RULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS service_recurrence_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency recurrence_frequency_enum NOT NULL,
  interval_count INTEGER NOT NULL DEFAULT 1,
  days_of_week INTEGER[] DEFAULT NULL,
  day_of_month INTEGER DEFAULT NULL,
  month_of_year INTEGER DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  max_occurrences INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_interval CHECK (interval_count > 0),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  CONSTRAINT valid_month CHECK (month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12))
);

-- =====================================================
-- PART 4: MAIN SCHEDULED SERVICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_services (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(unit_id) ON DELETE SET NULL,

  -- Service details
  service_type service_type_enum NOT NULL,
  custom_service_name VARCHAR(255) DEFAULT NULL,
  vendor_id UUID REFERENCES providers(provider_id) ON DELETE SET NULL,

  -- Category hierarchy (legacy fields)
  service_category_id UUID REFERENCES service_categories(category_id) ON DELETE SET NULL,
  catalog_service_type_id UUID REFERENCES service_types_catalog(service_type_id) ON DELETE SET NULL,

  -- Recurrence
  recurrence_rule_id UUID REFERENCES service_recurrence_rules(rule_id) ON DELETE SET NULL,
  parent_schedule_id UUID REFERENCES scheduled_services(schedule_id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  duration_minutes INTEGER DEFAULT 60,

  -- Status
  status schedule_status_enum NOT NULL DEFAULT 'scheduled',
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Legacy status fields
  partner_payment_status partner_payment_status_enum DEFAULT 'pending',
  allocation_status allocation_status_enum DEFAULT 'unassigned',

  -- Cost tracking
  estimated_cost DECIMAL(10, 2) DEFAULT NULL,
  actual_cost DECIMAL(10, 2) DEFAULT NULL,
  payment_date DATE DEFAULT NULL,
  payment_amount DECIMAL(10, 2) DEFAULT NULL,

  -- Notes and metadata
  notes TEXT DEFAULT NULL,
  internal_notes TEXT DEFAULT NULL,
  special_instructions TEXT DEFAULT NULL,

  -- Assignment tracking (legacy)
  assigned_at TIMESTAMPTZ DEFAULT NULL,
  assigned_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  property_owner_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,

  -- Completion tracking
  completed_at TIMESTAMPTZ DEFAULT NULL,
  completed_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  completion_notes TEXT DEFAULT NULL,

  -- Audit
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_times CHECK (end_time IS NULL OR scheduled_time IS NULL OR end_time > scheduled_time),
  CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- =====================================================
-- PART 5: NOTIFICATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS service_notification_settings (
  setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES scheduled_services(schedule_id) ON DELETE CASCADE,
  notify_vendor_before_hours INTEGER DEFAULT 24,
  notify_admin_before_hours INTEGER DEFAULT 48,
  notify_owner_before_hours INTEGER DEFAULT NULL,
  send_reminder BOOLEAN NOT NULL DEFAULT true,
  send_confirmation BOOLEAN NOT NULL DEFAULT true,
  send_completion BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id)
);

CREATE TABLE IF NOT EXISTS service_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES scheduled_services(schedule_id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('reminder', 'confirmation', 'completion', 'cancellation', 'reschedule')),
  recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('vendor', 'admin', 'owner', 'ops')),
  recipient_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) DEFAULT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT DEFAULT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 6: INDEXES
-- =====================================================

DO $$
BEGIN
  -- scheduled_services indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_property') THEN
    CREATE INDEX idx_scheduled_services_property ON scheduled_services(property_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_vendor') THEN
    CREATE INDEX idx_scheduled_services_vendor ON scheduled_services(vendor_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_date') THEN
    CREATE INDEX idx_scheduled_services_date ON scheduled_services(scheduled_date);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_status') THEN
    CREATE INDEX idx_scheduled_services_status ON scheduled_services(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_type') THEN
    CREATE INDEX idx_scheduled_services_type ON scheduled_services(service_type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_recurrence') THEN
    CREATE INDEX idx_scheduled_services_recurrence ON scheduled_services(recurrence_rule_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_date_status') THEN
    CREATE INDEX idx_scheduled_services_date_status ON scheduled_services(scheduled_date, status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_partner_status') THEN
    CREATE INDEX idx_scheduled_services_partner_status ON scheduled_services(partner_payment_status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_allocation') THEN
    CREATE INDEX idx_scheduled_services_allocation ON scheduled_services(allocation_status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_services_category') THEN
    CREATE INDEX idx_scheduled_services_category ON scheduled_services(service_category_id);
  END IF;

  -- service_types_catalog indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_service_types_catalog_category') THEN
    CREATE INDEX idx_service_types_catalog_category ON service_types_catalog(category_id);
  END IF;

  -- notification indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_service_notifications_schedule') THEN
    CREATE INDEX idx_service_notifications_schedule ON service_notifications(schedule_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_service_notifications_status') THEN
    CREATE INDEX idx_service_notifications_status ON service_notifications(status, scheduled_for);
  END IF;
END $$;

-- =====================================================
-- PART 7: RLS POLICIES
-- =====================================================

ALTER TABLE scheduled_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types_catalog ENABLE ROW LEVEL SECURITY;

-- scheduled_services policies
DROP POLICY IF EXISTS "Anyone can view scheduled services" ON scheduled_services;
CREATE POLICY "Anyone can view scheduled services" ON scheduled_services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage scheduled services" ON scheduled_services;
CREATE POLICY "Admin can manage scheduled services" ON scheduled_services
  FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Ops can manage scheduled services" ON scheduled_services;
CREATE POLICY "Ops can manage scheduled services" ON scheduled_services
  FOR ALL USING (get_user_role() = 'ops') WITH CHECK (get_user_role() = 'ops');

-- Note: Providers table doesn't have user_id column, so provider-specific policies
-- would need to be handled via a separate provider_users junction table if needed

-- service_recurrence_rules policies
DROP POLICY IF EXISTS "Anyone can view recurrence rules" ON service_recurrence_rules;
CREATE POLICY "Anyone can view recurrence rules" ON service_recurrence_rules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage recurrence rules" ON service_recurrence_rules;
CREATE POLICY "Admin can manage recurrence rules" ON service_recurrence_rules
  FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Ops can manage recurrence rules" ON service_recurrence_rules;
CREATE POLICY "Ops can manage recurrence rules" ON service_recurrence_rules
  FOR ALL USING (get_user_role() = 'ops') WITH CHECK (get_user_role() = 'ops');

-- service_notification_settings policies
DROP POLICY IF EXISTS "Anyone can view notification settings" ON service_notification_settings;
CREATE POLICY "Anyone can view notification settings" ON service_notification_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage notification settings" ON service_notification_settings;
CREATE POLICY "Admin can manage notification settings" ON service_notification_settings
  FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Ops can manage notification settings" ON service_notification_settings;
CREATE POLICY "Ops can manage notification settings" ON service_notification_settings
  FOR ALL USING (get_user_role() = 'ops') WITH CHECK (get_user_role() = 'ops');

-- service_notifications policies
DROP POLICY IF EXISTS "Anyone can view service notifications" ON service_notifications;
CREATE POLICY "Anyone can view service notifications" ON service_notifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage service notifications" ON service_notifications;
CREATE POLICY "Admin can manage service notifications" ON service_notifications
  FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Ops can manage service notifications" ON service_notifications;
CREATE POLICY "Ops can manage service notifications" ON service_notifications
  FOR ALL USING (get_user_role() = 'ops') WITH CHECK (get_user_role() = 'ops');

-- service_categories policies
DROP POLICY IF EXISTS "Anyone can view service categories" ON service_categories;
CREATE POLICY "Anyone can view service categories" ON service_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage service categories" ON service_categories;
CREATE POLICY "Admin can manage service categories" ON service_categories
  FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Ops can manage service categories" ON service_categories;
CREATE POLICY "Ops can manage service categories" ON service_categories
  FOR ALL USING (get_user_role() = 'ops') WITH CHECK (get_user_role() = 'ops');

-- service_types_catalog policies
DROP POLICY IF EXISTS "Anyone can view service types catalog" ON service_types_catalog;
CREATE POLICY "Anyone can view service types catalog" ON service_types_catalog
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage service types catalog" ON service_types_catalog;
CREATE POLICY "Admin can manage service types catalog" ON service_types_catalog
  FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Ops can manage service types catalog" ON service_types_catalog;
CREATE POLICY "Ops can manage service types catalog" ON service_types_catalog
  FOR ALL USING (get_user_role() = 'ops') WITH CHECK (get_user_role() = 'ops');

-- =====================================================
-- PART 8: TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_service_scheduling_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_scheduled_services_updated_at ON scheduled_services;
CREATE TRIGGER trigger_scheduled_services_updated_at
  BEFORE UPDATE ON scheduled_services
  FOR EACH ROW
  EXECUTE FUNCTION update_service_scheduling_updated_at();

DROP TRIGGER IF EXISTS trigger_service_recurrence_rules_updated_at ON service_recurrence_rules;
CREATE TRIGGER trigger_service_recurrence_rules_updated_at
  BEFORE UPDATE ON service_recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_service_scheduling_updated_at();

DROP TRIGGER IF EXISTS trigger_service_notification_settings_updated_at ON service_notification_settings;
CREATE TRIGGER trigger_service_notification_settings_updated_at
  BEFORE UPDATE ON service_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_service_scheduling_updated_at();

DROP TRIGGER IF EXISTS trigger_service_notifications_updated_at ON service_notifications;
CREATE TRIGGER trigger_service_notifications_updated_at
  BEFORE UPDATE ON service_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_service_scheduling_updated_at();

DROP TRIGGER IF EXISTS trigger_service_categories_updated_at ON service_categories;
CREATE TRIGGER trigger_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_service_scheduling_updated_at();

DROP TRIGGER IF EXISTS trigger_service_types_catalog_updated_at ON service_types_catalog;
CREATE TRIGGER trigger_service_types_catalog_updated_at
  BEFORE UPDATE ON service_types_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_service_scheduling_updated_at();

-- =====================================================
-- PART 9: SEED DATA
-- =====================================================

-- Seed service categories
INSERT INTO service_categories (category_name, category_code, description, sort_order) VALUES
  ('Cleaning', 'CLEANING', 'Cleaning and housekeeping services', 1),
  ('Maintenance', 'MAINTENANCE', 'Property maintenance and repairs', 2),
  ('Pool & Spa', 'POOL', 'Pool and spa services', 3),
  ('Landscaping', 'LANDSCAPE', 'Lawn care and landscaping services', 4),
  ('Pest Control', 'PEST', 'Pest control and extermination', 5),
  ('HVAC', 'HVAC', 'Heating, ventilation, and air conditioning', 6),
  ('Plumbing', 'PLUMBING', 'Plumbing services and repairs', 7),
  ('Electrical', 'ELECTRICAL', 'Electrical services and repairs', 8),
  ('Security', 'SECURITY', 'Security and alarm services', 9),
  ('Inspection', 'INSPECTION', 'Property inspections', 10),
  ('Other', 'OTHER', 'Other miscellaneous services', 99)
ON CONFLICT (category_code) DO NOTHING;

-- Seed service types
INSERT INTO service_types_catalog (category_id, service_name, service_code, default_duration_minutes, sort_order)
SELECT c.category_id, s.service_name, s.service_code, s.duration, s.sort_order
FROM service_categories c
CROSS JOIN (VALUES
  ('CLEANING', 'Regular Cleaning', 'REG_CLEAN', 120, 1),
  ('CLEANING', 'Deep Cleaning', 'DEEP_CLEAN', 240, 2),
  ('CLEANING', 'Move-In Cleaning', 'MOVEIN_CLEAN', 180, 3),
  ('CLEANING', 'Move-Out Cleaning', 'MOVEOUT_CLEAN', 180, 4),
  ('CLEANING', 'Post-Construction Cleaning', 'POST_CONST_CLEAN', 300, 5),
  ('CLEANING', 'Window Cleaning', 'WINDOW_CLEAN', 90, 6),
  ('CLEANING', 'Carpet Cleaning', 'CARPET_CLEAN', 120, 7),
  ('MAINTENANCE', 'General Maintenance', 'GEN_MAINT', 60, 1),
  ('MAINTENANCE', 'Appliance Repair', 'APPLIANCE_REP', 90, 2),
  ('MAINTENANCE', 'Furniture Assembly', 'FURN_ASSEMBLY', 120, 3),
  ('MAINTENANCE', 'Painting', 'PAINTING', 240, 4),
  ('MAINTENANCE', 'Drywall Repair', 'DRYWALL_REP', 120, 5),
  ('POOL', 'Pool Cleaning', 'POOL_CLEAN', 60, 1),
  ('POOL', 'Pool Maintenance', 'POOL_MAINT', 90, 2),
  ('POOL', 'Spa Service', 'SPA_SVC', 60, 3),
  ('POOL', 'Pool Equipment Repair', 'POOL_EQUIP_REP', 120, 4),
  ('LANDSCAPE', 'Lawn Mowing', 'LAWN_MOW', 60, 1),
  ('LANDSCAPE', 'Garden Maintenance', 'GARDEN_MAINT', 90, 2),
  ('LANDSCAPE', 'Tree Trimming', 'TREE_TRIM', 120, 3),
  ('LANDSCAPE', 'Irrigation Service', 'IRRIGATION', 60, 4),
  ('PEST', 'General Pest Control', 'GEN_PEST', 60, 1),
  ('PEST', 'Termite Treatment', 'TERMITE', 120, 2),
  ('PEST', 'Rodent Control', 'RODENT', 60, 3),
  ('HVAC', 'AC Service', 'AC_SVC', 60, 1),
  ('HVAC', 'AC Repair', 'AC_REP', 120, 2),
  ('HVAC', 'Filter Replacement', 'FILTER_REP', 30, 3),
  ('HVAC', 'Duct Cleaning', 'DUCT_CLEAN', 180, 4),
  ('PLUMBING', 'General Plumbing', 'GEN_PLUMB', 60, 1),
  ('PLUMBING', 'Drain Cleaning', 'DRAIN_CLEAN', 60, 2),
  ('PLUMBING', 'Water Heater Service', 'WATER_HEAT', 90, 3),
  ('PLUMBING', 'Leak Repair', 'LEAK_REP', 60, 4),
  ('ELECTRICAL', 'General Electrical', 'GEN_ELEC', 60, 1),
  ('ELECTRICAL', 'Outlet/Switch Repair', 'OUTLET_REP', 45, 2),
  ('ELECTRICAL', 'Lighting Installation', 'LIGHT_INST', 60, 3),
  ('ELECTRICAL', 'Panel Service', 'PANEL_SVC', 120, 4),
  ('INSPECTION', 'Property Inspection', 'PROP_INSP', 60, 1),
  ('INSPECTION', 'Pre-Arrival Inspection', 'PRE_ARRIVAL', 30, 2),
  ('INSPECTION', 'Post-Checkout Inspection', 'POST_CHECKOUT', 30, 3),
  ('INSPECTION', 'Annual Inspection', 'ANNUAL_INSP', 120, 4)
) AS s(cat_code, service_name, service_code, duration, sort_order)
WHERE c.category_code = s.cat_code
ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 10: HELPER VIEW
-- =====================================================

CREATE OR REPLACE VIEW scheduled_services_full AS
SELECT
  ss.*,
  p.property_name,
  u.property_name as unit_name,
  pr.provider_name as partner_name,
  pr.email as partner_email,
  pr.phone_primary as partner_phone,
  sc.category_name,
  sc.category_code,
  stc.service_name as catalog_service_name,
  stc.service_code as catalog_service_code,
  owner.first_name || ' ' || owner.last_name as property_owner_name,
  creator.first_name || ' ' || creator.last_name as created_by_name,
  assignor.first_name || ' ' || assignor.last_name as assigned_by_name
FROM scheduled_services ss
LEFT JOIN properties p ON ss.property_id = p.property_id
LEFT JOIN units u ON ss.unit_id = u.unit_id
LEFT JOIN providers pr ON ss.vendor_id = pr.provider_id
LEFT JOIN service_categories sc ON ss.service_category_id = sc.category_id
LEFT JOIN service_types_catalog stc ON ss.catalog_service_type_id = stc.service_type_id
LEFT JOIN public.users owner ON ss.property_owner_id = owner.user_id
LEFT JOIN public.users creator ON ss.created_by = creator.user_id
LEFT JOIN public.users assignor ON ss.assigned_by = assignor.user_id;

-- =====================================================
-- PART 11: COMMENTS
-- =====================================================

COMMENT ON TABLE scheduled_services IS 'Scheduled vendor services for properties';
COMMENT ON TABLE service_recurrence_rules IS 'Recurrence rules for recurring services';
COMMENT ON TABLE service_notification_settings IS 'Notification preferences per scheduled service';
COMMENT ON TABLE service_notifications IS 'Track sent notifications for services';
COMMENT ON TABLE service_categories IS 'Service categories for organizing service types';
COMMENT ON TABLE service_types_catalog IS 'Catalog of specific service types within categories';
COMMENT ON COLUMN scheduled_services.partner_payment_status IS 'Payment status to vendor/partner (Paid, Waiting, etc.)';
COMMENT ON COLUMN scheduled_services.allocation_status IS 'Vendor assignment status (Unassigned, Assigned, Accepted)';
COMMENT ON VIEW scheduled_services_full IS 'Complete view of scheduled services with all related data';
