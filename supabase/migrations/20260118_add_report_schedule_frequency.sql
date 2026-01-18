-- =============================================
-- Add Frequency Type and Date Range to Report Schedules
-- Supports weekly, monthly, and annual scheduling
-- Plus date range filtering for report content
-- =============================================

-- Add schedule_frequency column with default to weekly for existing records
ALTER TABLE report_email_schedules
ADD COLUMN IF NOT EXISTS schedule_frequency VARCHAR(20) DEFAULT 'weekly';

-- Add day_of_month for monthly/annual schedules (1-31)
ALTER TABLE report_email_schedules
ADD COLUMN IF NOT EXISTS day_of_month INTEGER DEFAULT NULL;

-- Add month_of_year for annual schedules (1-12)
ALTER TABLE report_email_schedules
ADD COLUMN IF NOT EXISTS month_of_year INTEGER DEFAULT NULL;

-- Add date range fields for report content filtering
ALTER TABLE report_email_schedules
ADD COLUMN IF NOT EXISTS date_range_start DATE DEFAULT NULL;

ALTER TABLE report_email_schedules
ADD COLUMN IF NOT EXISTS date_range_end DATE DEFAULT NULL;

-- Add constraint for schedule_frequency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_schedule_frequency'
  ) THEN
    ALTER TABLE report_email_schedules
    ADD CONSTRAINT valid_schedule_frequency
    CHECK (schedule_frequency IN ('weekly', 'monthly', 'annual'));
  END IF;
END $$;

-- Add constraint for day_of_month
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_day_of_month'
  ) THEN
    ALTER TABLE report_email_schedules
    ADD CONSTRAINT valid_day_of_month
    CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31));
  END IF;
END $$;

-- Add constraint for month_of_year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_month_of_year'
  ) THEN
    ALTER TABLE report_email_schedules
    ADD CONSTRAINT valid_month_of_year
    CHECK (month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12));
  END IF;
END $$;

-- Add constraint for valid date range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_date_range'
  ) THEN
    ALTER TABLE report_email_schedules
    ADD CONSTRAINT valid_date_range
    CHECK (
      (date_range_start IS NULL AND date_range_end IS NULL) OR
      (date_range_start IS NOT NULL AND date_range_end IS NOT NULL AND date_range_start <= date_range_end)
    );
  END IF;
END $$;

-- Make day_of_week nullable for monthly/annual schedules
ALTER TABLE report_email_schedules
ALTER COLUMN day_of_week DROP NOT NULL;

-- Drop old constraint if exists and add updated one
ALTER TABLE report_email_schedules DROP CONSTRAINT IF EXISTS report_email_schedules_day_of_week_check;
ALTER TABLE report_email_schedules
ADD CONSTRAINT valid_day_of_week
CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6));

-- Update existing records to have frequency = 'weekly'
UPDATE report_email_schedules
SET schedule_frequency = 'weekly'
WHERE schedule_frequency IS NULL;

-- Set NOT NULL after updating existing records
ALTER TABLE report_email_schedules
ALTER COLUMN schedule_frequency SET NOT NULL;

-- Update calculate_next_run_at function to handle different frequencies
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  p_schedule_frequency VARCHAR DEFAULT 'weekly',
  p_day_of_week INTEGER DEFAULT NULL,
  p_day_of_month INTEGER DEFAULT NULL,
  p_month_of_year INTEGER DEFAULT NULL,
  p_hour_of_day INTEGER DEFAULT 9,
  p_minute_of_hour INTEGER DEFAULT 0,
  p_timezone VARCHAR DEFAULT 'America/New_York'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_now TIMESTAMPTZ;
  v_target_time TIME;
  v_next_run TIMESTAMPTZ;
  v_days_until INTEGER;
  v_current_dow INTEGER;
  v_current_dom INTEGER;
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_target_date DATE;
BEGIN
  v_now := NOW() AT TIME ZONE p_timezone;
  v_target_time := MAKE_TIME(p_hour_of_day, p_minute_of_hour, 0);
  v_current_dow := EXTRACT(DOW FROM v_now)::INTEGER;
  v_current_dom := EXTRACT(DAY FROM v_now)::INTEGER;
  v_current_month := EXTRACT(MONTH FROM v_now)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM v_now)::INTEGER;

  IF p_schedule_frequency = 'weekly' THEN
    -- Weekly: use day_of_week
    IF p_day_of_week IS NULL THEN
      p_day_of_week := 5; -- Default to Friday
    END IF;

    v_days_until := p_day_of_week - v_current_dow;

    -- If it's the same day but time has passed, go to next week
    IF v_days_until = 0 AND v_now::TIME > v_target_time THEN
      v_days_until := 7;
    ELSIF v_days_until < 0 THEN
      v_days_until := v_days_until + 7;
    END IF;

    v_next_run := (v_now::DATE + v_days_until * INTERVAL '1 day' + v_target_time)::TIMESTAMPTZ;

  ELSIF p_schedule_frequency = 'monthly' THEN
    -- Monthly: use day_of_month
    IF p_day_of_month IS NULL THEN
      p_day_of_month := 1; -- Default to 1st of month
    END IF;

    -- Try this month first
    v_target_date := MAKE_DATE(v_current_year, v_current_month, LEAST(p_day_of_month,
      EXTRACT(DAY FROM (DATE_TRUNC('month', v_now::DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER));

    -- If we've passed that date/time, go to next month
    IF v_target_date < v_now::DATE OR (v_target_date = v_now::DATE AND v_now::TIME > v_target_time) THEN
      v_target_date := MAKE_DATE(
        CASE WHEN v_current_month = 12 THEN v_current_year + 1 ELSE v_current_year END,
        CASE WHEN v_current_month = 12 THEN 1 ELSE v_current_month + 1 END,
        LEAST(p_day_of_month,
          EXTRACT(DAY FROM (DATE_TRUNC('month', v_now::DATE + INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER)
      );
    END IF;

    v_next_run := (v_target_date + v_target_time)::TIMESTAMPTZ;

  ELSIF p_schedule_frequency = 'annual' THEN
    -- Annual: use month_of_year and day_of_month
    IF p_month_of_year IS NULL THEN
      p_month_of_year := 1; -- Default to January
    END IF;
    IF p_day_of_month IS NULL THEN
      p_day_of_month := 1; -- Default to 1st
    END IF;

    -- Try this year first
    v_target_date := MAKE_DATE(v_current_year, p_month_of_year,
      LEAST(p_day_of_month,
        EXTRACT(DAY FROM (MAKE_DATE(v_current_year, p_month_of_year, 1) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER));

    -- If we've passed that date/time, go to next year
    IF v_target_date < v_now::DATE OR (v_target_date = v_now::DATE AND v_now::TIME > v_target_time) THEN
      v_target_date := MAKE_DATE(v_current_year + 1, p_month_of_year,
        LEAST(p_day_of_month,
          EXTRACT(DAY FROM (MAKE_DATE(v_current_year + 1, p_month_of_year, 1) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER));
    END IF;

    v_next_run := (v_target_date + v_target_time)::TIMESTAMPTZ;

  ELSE
    -- Default to weekly Friday if unknown frequency
    v_days_until := 5 - v_current_dow;
    IF v_days_until <= 0 THEN v_days_until := v_days_until + 7; END IF;
    v_next_run := (v_now::DATE + v_days_until * INTERVAL '1 day' + v_target_time)::TIMESTAMPTZ;
  END IF;

  RETURN v_next_run AT TIME ZONE p_timezone AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Update trigger to use new function signature
CREATE OR REPLACE FUNCTION set_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_enabled THEN
    NEW.next_run_at := calculate_next_run_at(
      NEW.schedule_frequency,
      NEW.day_of_week,
      NEW.day_of_month,
      NEW.month_of_year,
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

-- Recreate trigger with updated columns
DROP TRIGGER IF EXISTS trigger_set_next_run_at ON report_email_schedules;
CREATE TRIGGER trigger_set_next_run_at
  BEFORE INSERT OR UPDATE OF schedule_frequency, day_of_week, day_of_month, month_of_year, hour_of_day, minute_of_hour, timezone, is_enabled
  ON report_email_schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_next_run_at();

-- Add comments
COMMENT ON COLUMN report_email_schedules.schedule_frequency IS 'Frequency of the schedule: weekly, monthly, or annual';
COMMENT ON COLUMN report_email_schedules.day_of_month IS 'Day of month for monthly/annual schedules (1-31)';
COMMENT ON COLUMN report_email_schedules.month_of_year IS 'Month of year for annual schedules (1-12)';
COMMENT ON COLUMN report_email_schedules.date_range_start IS 'Start date for report data filtering';
COMMENT ON COLUMN report_email_schedules.date_range_end IS 'End date for report data filtering';
