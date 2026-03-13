-- Add profiling columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cpv_codes text[] DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operating_regions text[] DEFAULT '{}';

-- Create an index for array searching on keywords to speed up matching
CREATE INDEX IF NOT EXISTS idx_companies_keywords ON companies USING GIN (keywords);
