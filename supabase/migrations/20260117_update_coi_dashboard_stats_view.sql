-- Fix COI Dashboard Stats View
-- Issue: Stats were counting based on stale 'status' column instead of actual dates
-- The status column requires a scheduled job (pg_cron) to update, which may not run reliably
-- Solution: Calculate status dynamically from valid_through date

-- Drop and recreate the view with date-based calculations
CREATE OR REPLACE VIEW coi_dashboard_stats AS
SELECT
    -- Active: valid_through is more than 30 days in the future
    COUNT(*) FILTER (WHERE valid_through > (CURRENT_DATE + INTERVAL '30 days')) AS active_cois,
    -- Expiring Soon: valid_through is within next 30 days (not yet expired)
    COUNT(*) FILTER (WHERE valid_through <= (CURRENT_DATE + INTERVAL '30 days') AND valid_through >= CURRENT_DATE) AS expiring_soon,
    -- Expired: valid_through is in the past
    COUNT(*) FILTER (WHERE valid_through < CURRENT_DATE) AS expired_cois,
    -- Total vendors with at least one COI
    COUNT(DISTINCT vendor_id) AS vendors_with_cois,
    -- Past due (same as expired, kept for backward compatibility)
    COUNT(*) FILTER (WHERE valid_through < CURRENT_DATE) AS past_due
FROM public.vendor_cois;

COMMENT ON VIEW coi_dashboard_stats IS 'Dashboard statistics for COI management - calculates status dynamically from dates';
