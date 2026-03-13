-- Add size column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS size bigint DEFAULT 0;
