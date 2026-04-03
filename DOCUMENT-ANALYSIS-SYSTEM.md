# Document Analysis System

## Overview

Sistem za automatsku analizu tenderske dokumentacije koji ekstraktuje zahtjeve direktno iz PDF/DOC/DOCX fajlova.

## Ključne karakteristike

- ✅ **100% Custom analiza** - Nema fallback na default dokumente
- ✅ **Automatsko prilaganje** - Ako dokument postoji u Vaultu, automatski se prilaže
- ✅ **Page references** - Svaki zahtjev ima reference na stranice u dokumentaciji
- ✅ **Source quotes** - Direktni citati iz dokumentacije
- ✅ **Besplatno** - Koristi besplatne biblioteke (pdf.js, mammoth)
- ✅ **AI analiza** - GPT-4o-mini (~$0.005 po tenderu)

## Arhitektura

### 1. Upload & Storage
```
User → Upload PDF/DOC/DOCX → Supabase Storage (tender-documents bucket)
```

### 2. Text Extraction
- **PDF**: `pdf-parse` - ekstraktuje tekst (page approximation)
- **DOCX**: `mammoth` - ekstraktuje tekst iz Word dokumenata
- **DOC**: `mammoth` - podržava i starije .doc formate

**Note**: Koristimo `pdf-parse` umjesto `pdfjs-dist` zbog Vercel deployment ograničenja. Page references su aproksimativni (tekst se dijeli na jednake dijelove).

### 3. AI Analysis
- **Model**: GPT-4o-mini
- **Strategija**: Chunking (20 stranica po chunk-u)
- **Output**: Strukturirani JSON sa zahtjevima, rokovima, rizicima

### 4. Auto-attach from Vault
- Sistem automatski traži dokumente u Vaultu
- Mapira `document_type` na vault tip
- Provjerava da li je dokument istekao
- Automatski prilaže ako je validan

## Database Schema

### tender_source_documents
```sql
- id: UUID
- tender_id: UUID (FK)
- company_id: UUID (FK)
- file_name: TEXT
- file_path: TEXT (Supabase Storage path)
- file_type: TEXT (pdf, docx, doc)
- file_size_bytes: BIGINT
- page_count: INTEGER
- extracted_text: TEXT
- processing_status: TEXT (pending, extracting, analyzing, complete, error)
- processing_error: TEXT
- processed_at: TIMESTAMPTZ
```

### tender_document_pages
```sql
- id: UUID
- document_id: UUID (FK)
- page_number: INTEGER
- text_content: TEXT
```

### bid_checklist_items (extended)
```sql
+ page_references: INTEGER[]
+ source_quote: TEXT
+ source_document_id: UUID (FK)
```

## API Routes

### POST /api/tenders/upload-documentation
Upload tenderske dokumentacije i pokreni analizu.

**Request:**
```typescript
FormData {
  file: File (PDF/DOC/DOCX, max 50MB)
  tender_id: string
}
```

**Response:**
```json
{
  "documentId": "uuid",
  "status": "processing"
}
```

### GET /api/tenders/document-status/[documentId]
Provjeri status obrade dokumenta.

**Response:**
```json
{
  "status": "complete",
  "pageCount": 24,
  "requirementsCount": 12,
  "error": null
}
```

## User Flow

1. **Klik na "Započni pripremu ponude"**
   - Otvara se modal sa upload zonom

2. **Upload dokumentacije**
   - Drag & drop ili click to select
   - Podržani formati: PDF, DOC, DOCX (do 50MB)

3. **Obrada (15-30s)**
   - Ekstraktovanje teksta po stranicama
   - AI analiza zahtjeva
   - Automatsko prilaganje dokumenata iz Vaulta

4. **Rezultat**
   - "Pronađeno X zahtjeva u dokumentaciji"
   - Klik na "Nastavi na pripremu"

5. **Bid Workspace**
   - Checklist sa svim zahtjevima
   - Page references za svaki zahtjev
   - Source quotes iz dokumentacije
   - Automatski priloženi dokumenti iz Vaulta

## AI Prompt Strategy

### System Prompt
```
Ti si ekspert za javne nabavke u BiH.

KRITIČNO VAŽNO:
- Ekstraktuj SAMO ono što EKSPLICITNO piše u dokumentaciji
- NE dodavaj standardne dokumente ako nisu navedeni
- NE pretpostavljaj ništa
- Za svaki zahtjev OBAVEZNO navedi broj stranice
```

### Response Schema
```typescript
{
  requirements: [
    {
      name: string,
      description: string,
      document_type: enum,
      is_required: boolean,
      page_references: number[],
      source_quote: string,
      risk_note: string | null
    }
  ],
  deadlines: [...],
  eligibility_conditions: [...],
  risk_flags: [...]
}
```

## Cost Analysis

Za 100 tendera mjesečno:
- Text extraction: **$0** (compute only)
- AI analysis: **$0.50** (100 × $0.005)
- Storage: **$0** (Supabase free tier: 1GB)

**Ukupno: ~$0.50/mjesec** 🎉

## Error Handling

### Upload Errors
- File too large (>50MB)
- Unsupported file type
- Upload to storage failed

### Processing Errors
- PDF extraction failed (corrupted file)
- AI analysis timeout
- Invalid document structure

Svi errori se loguju u `processing_error` kolonu i prikazuju korisniku.

## Security

### RLS Policies
- Users can only see documents for their company
- Service role can manage all documents (for processing)

### Storage Policies
- Authenticated users can upload to tender-documents bucket
- Users can only read their own documents
- Files are stored in company-specific folders

## Future Enhancements

1. **PDF Viewer Integration**
   - Click on page reference → Opens PDF at that page
   - Highlight relevant text

2. **OCR Support**
   - For scanned PDFs without text layer

3. **Multi-document Support**
   - Upload multiple files per tender
   - Merge analysis from all documents

4. **Smart Caching**
   - Vector embeddings for similar documents
   - Reuse analysis for same authority patterns

5. **Document Comparison**
   - Compare requirements across tenders
   - Identify missing documents

## Testing

```bash
# Run tests
npm test

# Test PDF extraction
npm test lib/document-extraction/pdf-extractor.test.ts

# Test AI analysis
npm test lib/ai/document-analysis.test.ts
```

## Deployment

1. Run migration:
```bash
supabase migration up
```

2. Install dependencies:
```bash
npm install
```

3. Set environment variables:
```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Deploy:
```bash
npm run build
```

## Monitoring

- Check `tender_source_documents.processing_status` for failed uploads
- Monitor `processing_error` column for error patterns
- Track AI costs via OpenAI dashboard
- Monitor storage usage in Supabase dashboard
