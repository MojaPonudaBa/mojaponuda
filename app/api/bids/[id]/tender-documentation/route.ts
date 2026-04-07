import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText } from "@/lib/tender-doc/extract";
import { analyzeTenderDocumentation, type TenderDocAnalysisResult } from "@/lib/tender-doc/analyze";
import type { BidChecklistItemInsert, Json, Tender } from "@/types/database";
import { AI_TO_VAULT_TYPE_MAP } from "@/lib/vault/constants";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bidId } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  // Verify bid belongs to user
  const { data: bid } = await supabase
    .from("bids")
    .select("id, company_id, tender_id, tenders(id, title)")
    .eq("id", bidId)
    .single();

  if (!bid) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", bid.company_id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Nemate pristup ovoj ponudi." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Fajl je obavezan." }, { status: 400 });
  }

  // Max 50MB
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Fajl ne smije biti veći od 50 MB." },
      { status: 400 },
    );
  }

  // Upload file to Supabase Storage
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `tender-docs/${bid.company_id}/${bidId}/${timestamp}_${sanitizedName}`;

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("documents")
    .upload(storagePath, new Uint8Array(fileBuffer), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Tender doc upload error:", uploadError);
    return NextResponse.json(
      { error: "Greška pri uploadu fajla." },
      { status: 500 },
    );
  }

  // Create the tender_doc_uploads record
  const { data: docUpload, error: insertError } = await supabaseAdmin
    .from("tender_doc_uploads")
    .insert({
      bid_id: bidId,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      content_type: file.type || null,
      status: "extracting",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Tender doc insert error:", insertError);
    return NextResponse.json(
      { error: "Greška pri spremanju dokumenta." },
      { status: 500 },
    );
  }

  // Extract text in the same request (non-blocking response would be better for very large files,
  // but for now we do it synchronously for simplicity)
  try {
    const extraction = await extractText(fileBuffer, file.type, file.name);

    // Update with extracted text
    await supabaseAdmin
      .from("tender_doc_uploads")
      .update({
        extracted_text: extraction.fullText,
        page_count: extraction.pageCount,
        status: "analyzing",
      })
      .eq("id", docUpload.id);

    // Run AI analysis
    const tenderData = bid.tenders as unknown as { id: string; title: string } | null;
    const analysis = await analyzeTenderDocumentation(
      extraction.fullText,
      tenderData?.title,
    );

    // Save analysis
    await supabaseAdmin
      .from("tender_doc_uploads")
      .update({
        ai_analysis: analysis as unknown as Json,
        status: "ready",
      })
      .eq("id", docUpload.id);

    // Replace checklist items with extracted requirements
    await rebuildChecklistFromAnalysis(supabase, supabaseAdmin, bidId, bid.company_id, analysis);

    // Also update bid's ai_analysis
    await supabaseAdmin
      .from("bids")
      .update({ ai_analysis: analysis as unknown as Json })
      .eq("id", bidId);

    return NextResponse.json(
      {
        success: true,
        doc_upload_id: docUpload.id,
        checklist_items_count: analysis.checklist_items.length,
        page_count: extraction.pageCount,
        status: "ready",
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri analizi dokumenta.";
    console.error("Tender doc processing error:", err);

    await supabaseAdmin
      .from("tender_doc_uploads")
      .update({
        status: "error",
        error_message: message,
      })
      .eq("id", docUpload.id);

    return NextResponse.json(
      { error: message, doc_upload_id: docUpload.id },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bidId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  // Verify access using admin client for the join
  const { data: bid } = await supabase
    .from("bids")
    .select("id, company_id")
    .eq("id", bidId)
    .single();

  if (!bid) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", bid.company_id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Nemate pristup." }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: uploads } = await supabaseAdmin
    .from("tender_doc_uploads")
    .select("id, file_name, file_size, content_type, page_count, status, ai_analysis, error_message, created_at")
    .eq("bid_id", bidId)
    .order("created_at", { ascending: false })
    .limit(1);

  return NextResponse.json({ upload: uploads?.[0] || null });
}

/**
 * Replace existing checklist items with items extracted from tender documentation.
 */
async function rebuildChecklistFromAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  bidId: string,
  companyId: string,
  analysis: TenderDocAnalysisResult,
) {
  // Delete existing checklist items
  await supabaseAdmin
    .from("bid_checklist_items")
    .delete()
    .eq("bid_id", bidId);

  // Delete existing bid_documents (auto-attached ones)
  await supabaseAdmin
    .from("bid_documents")
    .delete()
    .eq("bid_id", bidId);

  // Get vault documents for auto-matching
  const { data: vaultDocs } = await supabase
    .from("documents")
    .select("id, type, expires_at")
    .eq("company_id", companyId);

  // Create new checklist items from analysis
  const checklistRows: BidChecklistItemInsert[] = analysis.checklist_items.map(
    (item, idx) => {
      let docId: string | null = null;
      let status: "missing" | "attached" = "missing";

      if (item.document_type) {
        const targetType = AI_TO_VAULT_TYPE_MAP[item.document_type];
        if (targetType) {
          const match = vaultDocs?.find(
            (doc) =>
              doc.type === targetType &&
              (!doc.expires_at || new Date(doc.expires_at) > new Date()),
          );
          if (match) {
            docId = match.id;
            status = "attached";
          }
        }
      }

      // Build description with page reference
      let description = item.description;
      if (item.page_reference) {
        description = `📄 ${item.page_reference}\n${description}`;
      }
      if (item.source_text) {
        description += `\n\n📝 Iz dokumentacije: "${item.source_text}"`;
      }

      return {
        bid_id: bidId,
        title: item.name,
        description,
        status,
        document_id: docId,
        document_type: item.document_type,
        risk_note: item.risk_note || null,
        sort_order: idx,
      };
    },
  );

  if (checklistRows.length > 0) {
    await supabaseAdmin
      .from("bid_checklist_items")
      .insert(checklistRows);

    // Auto-attach matched vault documents
    const autoAttachedDocs = checklistRows
      .filter((row) => row.document_id)
      .map((row) => ({
        bid_id: bidId,
        document_id: row.document_id!,
        checklist_item_name: row.title,
        is_confirmed: false,
      }));

    if (autoAttachedDocs.length > 0) {
      await supabaseAdmin
        .from("bid_documents")
        .insert(autoAttachedDocs);
    }
  }
}
