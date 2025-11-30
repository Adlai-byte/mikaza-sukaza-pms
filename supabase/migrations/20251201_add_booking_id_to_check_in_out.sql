-- Add booking_id to check_in_out_records table
-- This links check-in/out records to specific bookings for better flow

-- Add booking_id column
ALTER TABLE check_in_out_records
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES property_bookings(booking_id) ON DELETE SET NULL;

-- Create index for booking lookups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_in_out_booking') THEN
    CREATE INDEX idx_check_in_out_booking ON check_in_out_records(booking_id);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN check_in_out_records.booking_id IS 'Links check-in/out record to a specific booking for context and flow';
