-- Add ai_analysis column to tenders table to cache analysis results
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS ai_analysis jsonb;
