-- CLEANUP SCRIPT FOR CHECK-IN/OUT MODULE
-- Only run this if you need to completely reset the check-in/out tables
-- WARNING: This will delete all data in these tables!

-- Drop policies first
DROP POLICY IF EXISTS "Admins can manage all checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Ops can view checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Admins can manage all check-in/out records" ON check_in_out_records;
DROP POLICY IF EXISTS "Ops can manage check-in/out records" ON check_in_out_records;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_checklist_templates_updated_at ON checklist_templates;
DROP TRIGGER IF EXISTS trigger_update_check_in_out_records_updated_at ON check_in_out_records;

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS check_in_out_records CASCADE;
DROP TABLE IF EXISTS checklist_templates CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_checklist_templates_updated_at();
DROP FUNCTION IF EXISTS update_check_in_out_records_updated_at();

-- Note: After running this cleanup, you can run the v2 migration to recreate everything
