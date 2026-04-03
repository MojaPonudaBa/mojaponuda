import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromDocument } from "@/lib/document-extraction";
import { analyzeDocumentationInChunks } from "@/lib/ai/document-analysis";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tenderId = formData.get("tender_id") as string;

    if (!file || !tenderId) {
      return NextResponse.json(
        { error: "Nedostaje fajl ili tender ID." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fajl je prevelik. Maksimalna veličina je 50MB." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Nepodržan tip fajla. Podržani formati: PDF, DOC, DOCX." },
        { status: 400 }
      );
    }

    // Get company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: "Firma nije pronađena." },
        { status: 403 }
      );
    }

    // Verify tender exists
    const { data: tender } = await supabase
      .from("tenders")
      .select("id, title, contracting_authority")
      .eq("id", tenderId)
      .single();

    if (!tender) {
      return NextResponse.json(
        { error: "Tender nije pronađen." },
        { status: 404 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${company.id}/${tenderId}/${fileName}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("tender-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Greška pri uploadu fajla." },
        { status: 500 }
      );
    }

    // Create document record
    const supabaseAdmin = createAdminClient();
    const { data: document, error: docError } = await supabaseAdmin
      .from("tender_source_documents")
      .insert({
        tender_id: tenderId,
        company_id: company.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size_bytes: file.size,
        processing_status: "extracting",
      })
      .select()
      .single();

    if (docError || !document) {
      console.error("Document record error:", docError);
      return NextResponse.json(
        { error: "Greška pri kreiranju zapisa." },
        { status: 500 }
      );
    }

    // Start async processing
    processDocumentAsync(document.id, fileBuffer, file.type, tender).catch(
      (error) => {
        console.error("Async processing error:", error);
      }
    );

    return NextResponse.json(
      {
        documentId: document.id,
        status: "processing",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Greška pri obradi fajla.",
      },
      { status: 500 }
    );
  }
}

async function processDocumentAsync(
  documentId: string,
  fileBuffer: Buffer,
  fileType: string,
  tender: { id: string; title: string; contracting_authority: string | null }
) {
  const supabaseAdmin = createAdminClient();

  try {
    // Extract text
    const extraction = await extractTextFromDocument(fileBuffer, fileType);

    // Update document with extracted text
    await supabaseAdmin
      .from("tender_source_documents")
      .update({
        extracted_text: extraction.text,
        page_count: extraction.pageCount || null,
        processing_status: "analyzing",
      })
      .eq("id", documentId);

    // Store pages if available
    if (extraction.pages && extraction.pages.length > 0) {
      const pageRecords = extraction.pages.map((page) => ({
        document_id: documentId,
        page_number: page.pageNumber,
        text_content: page.text,
      }));

      await supabaseAdmin.from("tender_document_pages").insert(pageRecords);
    }

    // Analyze with AI
    const analysis = extraction.pages
      ? await analyzeDocumentationInChunks(
          extraction.pages,
          tender.title,
          tender.contracting_authority
        )
      : await analyzeDocumentationInChunks(
          [{ pageNumber: 1, text: extraction.text }],
          tender.title,
          tender.contracting_authority
        );

    // Store analysis in tender
    await supabaseAdmin
      .from("tenders")
      .update({
        ai_analysis: {
          document_analysis: analysis,
          analyzed_at: new Date().toISOString(),
        },
      })
      .eq("id", tender.id);

    // Mark as complete
    await supabaseAdmin
      .from("tender_source_documents")
      .update({
        processing_status: "complete",
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);
  } catch (error) {
    console.error("Document processing error:", error);
    await supabaseAdmin
      .from("tender_source_documents")
      .update({
        processing_status: "error",
        processing_error:
          error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", documentId);
  }
}
