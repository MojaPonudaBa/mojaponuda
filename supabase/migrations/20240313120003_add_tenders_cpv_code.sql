-- Add cpv_code column to tenders table
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS cpv_code text;

-- Index for CPV-based recommendation queries
CREATE INDEX IF NOT EXISTS idx_tenders_cpv_code ON tenders(cpv_code);
