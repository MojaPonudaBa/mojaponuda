-- ============================================================
-- Tender Documentation Analysis System
-- Stores uploaded tender documents and extracted requirements
-- ============================================================

-- Storage bucket for tender documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tender-documents', 'tender-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for tender documents bucket
CREATE POLICY "Users can upload tender documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tender-documents');

CREATE POLICY "Users can read their tender documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tender-documents');

CREATE POLICY "Users can delete their tender documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tender-documents');

-- Table: tender_source_documents
-- Stores uploaded tender documentation files
CREATE TABLE IF NOT EXISTS tender_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  page_count INTEGER,
  extracted_text TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tender_source_documents_tender_id ON tender_source_documents(tender_id);
CREATE INDEX idx_tender_source_documents_company_id ON tender_source_documents(company_id);
CREATE INDEX idx_tender_source_documents_status ON tender_source_documents(processing_status);

-- Table: tender_document_pages
-- Stores individual pages from tender documents
CREATE TABLE IF NOT EXISTS tender_document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES tender_source_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, page_number)
);

CREATE INDEX idx_tender_document_pages_document_id ON tender_document_pages(document_id);

-- Add columns to bid_checklist_items for document references
ALTER TABLE bid_checklist_items 
ADD COLUMN IF NOT EXISTS page_references INTEGER[],
ADD COLUMN IF NOT EXISTS source_quote TEXT,
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES tender_source_documents(id) ON DELETE SET NULL;

-- RLS Policies
ALTER TABLE tender_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_document_pages ENABLE ROW LEVEL SECURITY;

-- Users can only see documents for their company
CREATE POLICY "Users can view their company's tender documents"
ON tender_source_documents FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- Users can insert documents for their company
CREATE POLICY "Users can upload tender documents for their company"
ON tender_source_documents FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- Users can update their company's documents
CREATE POLICY "Users can update their company's tender documents"
ON tender_source_documents FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- Users can delete their company's documents
CREATE POLICY "Users can delete their company's tender documents"
ON tender_source_documents FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- Document pages inherit permissions from parent document
CREATE POLICY "Users can view pages from their company's documents"
ON tender_document_pages FOR SELECT
TO authenticated
USING (
  document_id IN (
    SELECT id FROM tender_source_documents 
    WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
);

-- Service role policies for processing
CREATE POLICY "Service role can manage all tender documents"
ON tender_source_documents FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage all document pages"
ON tender_document_pages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tender_source_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tender_source_documents_updated_at
BEFORE UPDATE ON tender_source_documents
FOR EACH ROW
EXECUTE FUNCTION update_tender_source_documents_updated_at();
