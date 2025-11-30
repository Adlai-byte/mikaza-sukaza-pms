-- Add contract_type column to documents table
ALTER TABLE documents
ADD COLUMN contract_type TEXT;

-- Add check constraint for valid contract types
ALTER TABLE documents
ADD CONSTRAINT documents_contract_type_check
CHECK (
  (category != 'contracts') OR
  (category = 'contracts' AND contract_type IN (
    'lease_agreement',
    'service_contract',
    'vendor_agreement',
    'employment_contract',
    'nda',
    'maintenance_contract',
    'insurance_policy',
    'partnership_agreement',
    'purchase_agreement',
    'other'
  ))
);

-- Add comment to explain the column
COMMENT ON COLUMN documents.contract_type IS 'Type of contract - only applicable when category is contracts';

-- Create index for filtering by contract type
CREATE INDEX idx_documents_contract_type ON documents(contract_type)
WHERE category = 'contracts';
