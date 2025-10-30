-- =====================================================
-- NOTIFICATION SYSTEM
-- =====================================================
-- Version: 1.0
-- Description: WhatsApp/SMS notification system for guest communication
-- Features:
--   - User notification preferences
--   - Notification templates
--   - Notification logs/history
--   - Support for WhatsApp and SMS channels
-- =====================================================

-- =====================================================
-- 1. NOTIFICATION PREFERENCES TABLE
-- =====================================================
-- Stores user preferences for notification channels
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Channel preferences
  whatsapp_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,

  -- Contact information
  whatsapp_number VARCHAR(20),
  sms_number VARCHAR(20),

  -- Notification types (what they want to receive)
  booking_confirmations BOOLEAN DEFAULT true,
  booking_reminders BOOLEAN DEFAULT true,
  check_in_reminders BOOLEAN DEFAULT true,
  check_out_reminders BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  special_offers BOOLEAN DEFAULT false,

  -- Quiet hours (don't send during these times)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_preferences UNIQUE(user_id),
  CONSTRAINT valid_whatsapp_number CHECK (
    whatsapp_number IS NULL OR
    whatsapp_number ~ '^\+[1-9]\d{1,14}$'
  ),
  CONSTRAINT valid_sms_number CHECK (
    sms_number IS NULL OR
    sms_number ~ '^\+[1-9]\d{1,14}$'
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user
  ON notification_preferences(user_id);

-- =====================================================
-- 2. NOTIFICATION TEMPLATES TABLE
-- =====================================================
-- Reusable message templates with variable substitution
CREATE TABLE IF NOT EXISTS notification_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'booking_confirmation', 'check_in_reminder', etc.

  -- Message content
  subject VARCHAR(200), -- For email
  message_body TEXT NOT NULL,

  -- Channel support
  supports_whatsapp BOOLEAN DEFAULT true,
  supports_sms BOOLEAN DEFAULT true,
  supports_email BOOLEAN DEFAULT true,

  -- Variables used in template (for documentation)
  variables JSONB DEFAULT '[]'::jsonb, -- e.g., ['guest_name', 'property_name', 'check_in_date']

  -- Language support
  language VARCHAR(5) DEFAULT 'en', -- 'en', 'pt', 'es'

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system_template BOOLEAN DEFAULT false, -- System templates can't be deleted

  -- Metadata
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_template_type CHECK (
    template_type IN (
      'booking_confirmation',
      'booking_reminder',
      'check_in_reminder',
      'check_out_reminder',
      'payment_reminder',
      'payment_confirmation',
      'cancellation',
      'special_offer',
      'custom'
    )
  ),
  CONSTRAINT valid_language CHECK (language IN ('en', 'pt', 'es'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_type
  ON notification_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_active
  ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_language
  ON notification_templates(language);

-- =====================================================
-- 3. NOTIFICATION LOGS TABLE
-- =====================================================
-- History of all sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipients
  recipient_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recipient_name VARCHAR(200),
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),

  -- Message details
  channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'sms', 'email'
  template_id UUID REFERENCES notification_templates(template_id) ON DELETE SET NULL,
  subject VARCHAR(200),
  message_body TEXT NOT NULL,

  -- Related entities
  booking_id UUID REFERENCES property_bookings(booking_id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(property_id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE SET NULL,

  -- Delivery status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'read'
  provider_message_id VARCHAR(255), -- ID from Twilio/provider
  error_message TEXT,

  -- Cost tracking
  cost_amount DECIMAL(10, 4),
  cost_currency VARCHAR(3) DEFAULT 'USD',

  -- Metadata
  sent_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_channel CHECK (channel IN ('whatsapp', 'sms', 'email')),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'read', 'undelivered')
  )
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_logs_recipient_user
  ON notification_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_logs_booking
  ON notification_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_logs_status
  ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_channel
  ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_logs_created
  ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_sent
  ON notification_logs(sent_at DESC);

-- =====================================================
-- 4. NOTIFICATION QUEUE TABLE
-- =====================================================
-- Queue for scheduled/batch notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Notification details
  recipient_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),
  channel VARCHAR(20) NOT NULL,
  template_id UUID REFERENCES notification_templates(template_id) ON DELETE CASCADE,
  message_body TEXT NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)

  -- Related entities
  booking_id UUID REFERENCES property_bookings(booking_id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(property_id) ON DELETE SET NULL,

  -- Processing status
  status VARCHAR(20) DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT valid_queue_channel CHECK (channel IN ('whatsapp', 'sms', 'email')),
  CONSTRAINT valid_queue_status CHECK (
    status IN ('queued', 'processing', 'sent', 'failed', 'cancelled')
  )
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_queue_status
  ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled
  ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_queue_priority
  ON notification_queue(priority DESC, scheduled_for);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Update updated_at timestamp for preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_preferences_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Update updated_at timestamp for templates
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_templates_timestamp
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();

-- =====================================================
-- 6. DEFAULT TEMPLATES
-- =====================================================
-- Insert system templates in English

INSERT INTO notification_templates (
  template_name,
  template_type,
  subject,
  message_body,
  supports_whatsapp,
  supports_sms,
  supports_email,
  variables,
  language,
  is_system_template
) VALUES
-- Booking Confirmation
(
  'Booking Confirmation',
  'booking_confirmation',
  'Booking Confirmed - {{property_name}}',
  'Hi {{guest_name}}! 🎉

Your booking at {{property_name}} is confirmed!

📅 Check-in: {{check_in_date}}
📅 Check-out: {{check_out_date}}
👥 Guests: {{num_guests}}
💰 Total: {{total_amount}}

We look forward to hosting you! If you have any questions, feel free to reply to this message.

Casa & Concierge',
  true,
  true,
  true,
  '["guest_name", "property_name", "check_in_date", "check_out_date", "num_guests", "total_amount"]'::jsonb,
  'en',
  true
),
-- Check-in Reminder (24 hours before)
(
  'Check-in Reminder',
  'check_in_reminder',
  'Check-in Tomorrow - {{property_name}}',
  'Hi {{guest_name}}! 👋

Just a friendly reminder that your check-in is tomorrow!

📅 Date: {{check_in_date}}
🕐 Time: {{check_in_time}}
📍 Property: {{property_name}}
📍 Address: {{property_address}}

Check-in instructions and access codes will be sent 2 hours before your arrival.

See you soon!
Casa & Concierge',
  true,
  true,
  true,
  '["guest_name", "property_name", "check_in_date", "check_in_time", "property_address"]'::jsonb,
  'en',
  true
),
-- Check-out Reminder
(
  'Check-out Reminder',
  'check_out_reminder',
  'Check-out Today - {{property_name}}',
  'Hi {{guest_name}}!

Your check-out is today.

🕐 Check-out time: {{check_out_time}}
📍 Property: {{property_name}}

Please ensure:
✓ All windows and doors are locked
✓ Lights and appliances are turned off
✓ Keys are returned to the lockbox
✓ Trash is taken out

We hope you enjoyed your stay! Safe travels! 🌟

Casa & Concierge',
  true,
  true,
  true,
  '["guest_name", "property_name", "check_out_time"]'::jsonb,
  'en',
  true
),
-- Payment Reminder
(
  'Payment Reminder',
  'payment_reminder',
  'Payment Reminder - {{property_name}}',
  'Hi {{guest_name}},

This is a friendly reminder that payment is due for your booking at {{property_name}}.

💰 Amount Due: {{amount_due}}
📅 Due Date: {{due_date}}

You can make payment via:
• Bank transfer
• Credit card
• Online payment portal

Please contact us if you have any questions.

Thank you!
Casa & Concierge',
  true,
  true,
  true,
  '["guest_name", "property_name", "amount_due", "due_date"]'::jsonb,
  'en',
  true
),
-- Payment Confirmation
(
  'Payment Confirmation',
  'payment_confirmation',
  'Payment Received - Thank You!',
  'Hi {{guest_name}}! ✅

We have received your payment of {{amount_paid}} for your booking at {{property_name}}.

Receipt: #{{receipt_number}}
Date: {{payment_date}}

Your balance is now: {{remaining_balance}}

Thank you for your prompt payment!

Casa & Concierge',
  true,
  true,
  true,
  '["guest_name", "property_name", "amount_paid", "receipt_number", "payment_date", "remaining_balance"]'::jsonb,
  'en',
  true
);

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Notification Preferences Policies
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all preferences"
  ON notification_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Notification Templates Policies
CREATE POLICY "Anyone can view active templates"
  ON notification_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage templates"
  ON notification_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Notification Logs Policies
CREATE POLICY "Users can view their own notifications"
  ON notification_logs FOR SELECT
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Admin can view all notification logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

CREATE POLICY "Ops can create notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Notification Queue Policies
CREATE POLICY "Admin can manage notification queue"
  ON notification_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- =====================================================
-- 8. HELPER VIEWS
-- =====================================================

-- View for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT
  channel,
  status,
  DATE(created_at) as date,
  COUNT(*) as count,
  SUM(cost_amount) as total_cost,
  AVG(
    CASE
      WHEN delivered_at IS NOT NULL AND sent_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (delivered_at - sent_at))
      ELSE NULL
    END
  ) as avg_delivery_time_seconds
FROM notification_logs
GROUP BY channel, status, DATE(created_at);

-- View for recent notifications per user
CREATE OR REPLACE VIEW user_recent_notifications AS
SELECT
  nl.*,
  u.first_name,
  u.last_name,
  u.email,
  nt.template_name,
  nt.template_type
FROM notification_logs nl
LEFT JOIN users u ON nl.recipient_user_id = u.user_id
LEFT JOIN notification_templates nt ON nl.template_id = nt.template_id
ORDER BY nl.created_at DESC;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels and types';
COMMENT ON TABLE notification_templates IS 'Reusable message templates with variable substitution';
COMMENT ON TABLE notification_logs IS 'History of all sent notifications with delivery status';
COMMENT ON TABLE notification_queue IS 'Queue for scheduled and batch notifications';

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT ON notification_templates TO authenticated;
GRANT SELECT, INSERT ON notification_logs TO authenticated;
GRANT SELECT ON notification_queue TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
