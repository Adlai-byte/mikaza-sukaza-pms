-- Add relationship_to_main_owner column to users table
ALTER TABLE users ADD COLUMN relationship_to_main_owner text;

-- Add a check constraint to ensure valid relationship types
ALTER TABLE users ADD CONSTRAINT check_relationship_type
CHECK (relationship_to_main_owner IN (
  'None', 'Spouse', 'Mother', 'Father', 'Son', 'Daughter',
  'Brother', 'Sister', 'Grandfather', 'Grandmother',
  'Uncle', 'Aunt', 'Cousin', 'Friend', 'Business Partner', 'Other'
));

-- Set default value for existing records
UPDATE users SET relationship_to_main_owner = 'None' WHERE relationship_to_main_owner IS NULL;