-- ============================================================================
-- User Lifecycle Management Migration
-- ============================================================================
-- Adds fields for user lifecycle tracking: suspended, archived, last login
-- Date: 2025-01-16
-- ============================================================================

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'archived')),
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status) WHERE account_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE last_login_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspended_at ON users(suspended_at) WHERE suspended_at IS NOT NULL;

-- Update existing users to have 'active' status
UPDATE users
SET account_status = 'active'
WHERE account_status IS NULL;

-- Add comment documentation
COMMENT ON COLUMN users.account_status IS 'Current account status: active, suspended, or archived';
COMMENT ON COLUMN users.suspended_at IS 'Timestamp when user was suspended';
COMMENT ON COLUMN users.suspended_by IS 'Admin user who suspended this account';
COMMENT ON COLUMN users.suspension_reason IS 'Reason for account suspension';
COMMENT ON COLUMN users.archived_at IS 'Timestamp when user was archived (soft deleted)';
COMMENT ON COLUMN users.archived_by IS 'Admin user who archived this account';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of most recent successful login';

-- Add similar columns to profiles table for consistency
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'archived')),
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Update existing profiles
UPDATE profiles
SET account_status = 'active'
WHERE account_status IS NULL;

-- Create view for active users (excludes archived)
CREATE OR REPLACE VIEW active_users AS
SELECT *
FROM users
WHERE account_status IN ('active', 'suspended')
ORDER BY created_at DESC;

-- Create view for inactive users (for admin review)
CREATE OR REPLACE VIEW inactive_users AS
SELECT
  user_id,
  email,
  first_name,
  last_name,
  user_type,
  account_status,
  last_login_at,
  created_at,
  CASE
    WHEN last_login_at IS NULL THEN EXTRACT(DAY FROM NOW() - created_at)
    ELSE EXTRACT(DAY FROM NOW() - last_login_at)
  END as days_inactive
FROM users
WHERE
  account_status = 'active'
  AND (
    last_login_at IS NULL AND created_at < NOW() - INTERVAL '90 days'
    OR last_login_at < NOW() - INTERVAL '90 days'
  )
ORDER BY days_inactive DESC;

-- Grant appropriate permissions
GRANT SELECT ON active_users TO authenticated;
GRANT SELECT ON inactive_users TO authenticated;

-- Add trigger to automatically sync account_status between users and profiles
CREATE OR REPLACE FUNCTION sync_user_profile_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile when user status changes
  UPDATE profiles
  SET
    account_status = NEW.account_status,
    last_login_at = NEW.last_login_at
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_user_profile_status_trigger ON users;
CREATE TRIGGER sync_user_profile_status_trigger
AFTER UPDATE OF account_status, last_login_at ON users
FOR EACH ROW
WHEN (OLD.account_status IS DISTINCT FROM NEW.account_status
      OR OLD.last_login_at IS DISTINCT FROM NEW.last_login_at)
EXECUTE FUNCTION sync_user_profile_status();

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the migration completed successfully:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('account_status', 'suspended_at', 'suspended_by',
--                     'suspension_reason', 'archived_at', 'archived_by',
--                     'last_login_at');
-- ============================================================================
