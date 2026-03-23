-- Ensure cpv_code column exists in tenders (idempotent)
-- This column was defined in migration 20240313120003 but may not be
-- applied in the production database yet.
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS cpv_code text;

-- Ensure index exists (idempotent)
CREATE INDEX IF NOT EXISTS idx_tenders_cpv_code ON tenders(cpv_code);
