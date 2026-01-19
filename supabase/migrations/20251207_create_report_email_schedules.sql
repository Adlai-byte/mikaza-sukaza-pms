-- =============================================
-- Report Email Schedules System
-- Automated report generation and email delivery
-- =============================================

-- Table: report_email_schedules
-- Stores schedule configurations for automated report emails
CREATE TABLE IF NOT EXISTS report_email_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Schedule metadata
  schedule_name VARCHAR(200) NOT NULL,
  report_type VARCHAR(50) NOT NULL,

  -- Schedule timing
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 5=Friday, 6=Saturday
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  minute_of_hour INTEGER NOT NULL DEFAULT 0 CHECK (minute_of_hour >= 0 AND minute_of_hour <= 59),
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- Recipients (array of email addresses)
  recipient_emails TEXT[] NOT NULL,

  -- Report filters (JSONB for flexibility)
  report_filters JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_enabled BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_report_type CHECK (
    report_type IN (
      'current_balance',
      'financial_entries',
      'active_clients',
      'inactive_clients',
      'bookings_enhanced',
      'rental_revenue'
    )
  )
);

-- Table: report_email_history
-- Logs all sent report emails for tracking and debugging
CREATE TABLE IF NOT EXISTS report_email_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES report_email_schedules(schedule_id) ON DELETE CASCADE,

  -- Execution details
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Recipients at time of send
  recipient_emails TEXT[] NOT NULL,

  -- Result details
  email_provider_id VARCHAR(255), -- Resend email ID
  error_message TEXT,

  -- Report snapshot
  report_row_count INTEGER,
  report_generation_time_ms INTEGER,

  -- Constraints
  CONSTRAINT valid_history_status CHECK (status IN ('pending', 'sending', 'sent', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled_next_run
  ON report_email_schedules(is_enabled, next_run_at)
  WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_report_schedules_created_by
  ON report_email_schedules(created_by);

CREATE INDEX IF NOT EXISTS idx_report_email_history_schedule_id
  ON report_email_history(schedule_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_email_history_status
  ON report_email_history(status, sent_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_report_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_schedule_updated_at ON report_email_schedules;
CREATE TRIGGER trigger_update_report_schedule_updated_at
  BEFORE UPDATE ON report_email_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_report_schedule_updated_at();

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  p_day_of_week INTEGER,
  p_hour_of_day INTEGER,
  p_minute_of_hour INTEGER,
  p_timezone VARCHAR DEFAULT 'America/New_York'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_now TIMESTAMPTZ;
  v_target_time TIME;
  v_next_run TIMESTAMPTZ;
  v_days_until INTEGER;
  v_current_dow INTEGER;
BEGIN
  v_now := NOW() AT TIME ZONE p_timezone;
  v_target_time := MAKE_TIME(p_hour_of_day, p_minute_of_hour, 0);
  v_current_dow := EXTRACT(DOW FROM v_now)::INTEGER;

  -- Calculate days until target day
  v_days_until := p_day_of_week - v_current_dow;

  -- If it's the same day but time has passed, go to next week
  IF v_days_until = 0 AND v_now::TIME > v_target_time THEN
    v_days_until := 7;
  ELSIF v_days_until < 0 THEN
    v_days_until := v_days_until + 7;
  END IF;

  -- Calculate next run timestamp
  v_next_run := (v_now::DATE + v_days_until * INTERVAL '1 day' + v_target_time)::TIMESTAMPTZ;

  RETURN v_next_run AT TIME ZONE p_timezone AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Trigger to set next_run_at on insert/update
CREATE OR REPLACE FUNCTION set_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_enabled THEN
    NEW.next_run_at := calculate_next_run_at(
      NEW.day_of_week,
      NEW.hour_of_day,
      NEW.minute_of_hour,
      NEW.timezone
    );
  ELSE
    NEW.next_run_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_next_run_at ON report_email_schedules;
CREATE TRIGGER trigger_set_next_run_at
  BEFORE INSERT OR UPDATE OF day_of_week, hour_of_day, minute_of_hour, timezone, is_enabled
  ON report_email_schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_next_run_at();

-- Enable RLS
ALTER TABLE report_email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_email_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_email_schedules
DROP POLICY IF EXISTS "Admin and ops can view all schedules" ON report_email_schedules;
CREATE POLICY "Admin and ops can view all schedules"
  ON report_email_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

DROP POLICY IF EXISTS "Admin and ops can create schedules" ON report_email_schedules;
CREATE POLICY "Admin and ops can create schedules"
  ON report_email_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

DROP POLICY IF EXISTS "Admin and ops can update schedules" ON report_email_schedules;
CREATE POLICY "Admin and ops can update schedules"
  ON report_email_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

DROP POLICY IF EXISTS "Admin can delete schedules" ON report_email_schedules;
CREATE POLICY "Admin can delete schedules"
  ON report_email_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- RLS Policies for report_email_history
DROP POLICY IF EXISTS "Admin and ops can view history" ON report_email_history;
CREATE POLICY "Admin and ops can view history"
  ON report_email_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

DROP POLICY IF EXISTS "System can insert history" ON report_email_history;
CREATE POLICY "System can insert history"
  ON report_email_history FOR INSERT
  WITH CHECK (true); -- Edge function uses service role

-- Comments for documentation
COMMENT ON TABLE report_email_schedules IS 'Stores configurations for automated report email schedules';
COMMENT ON TABLE report_email_history IS 'Logs all sent report emails for tracking and debugging';
COMMENT ON COLUMN report_email_schedules.day_of_week IS '0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday';
COMMENT ON COLUMN report_email_schedules.report_type IS 'Type of report: current_balance, financial_entries, etc.';
COMMENT ON COLUMN report_email_schedules.recipient_emails IS 'Array of email addresses to send the report to';
COMMENT ON COLUMN report_email_schedules.report_filters IS 'Optional JSONB filters to apply when generating the report';
