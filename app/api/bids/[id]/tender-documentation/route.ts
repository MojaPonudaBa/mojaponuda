import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBidAccess } from "@/lib/bids/access";
import { extractText } from "@/lib/tender-doc/extract";
import { analyzeTenderDocumentation, type TenderDocAnalysisResult } from "@/lib/tender-doc/analyze";
import { scanForAnnexes, mergeAnnexesIntoChecklist } from "@/lib/tender-doc/annex-scanner";
import type { BidChecklistItemInsert, Json } from "@/types/database";
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

  const access = await resolveBidAccess(supabase, user.id, bidId);
  if (!access) {
    return NextResponse.json({ error: "Ponuda nije pronadjena." }, { status: 404 });
  }

  const { data: bid } = await supabase
    .from("bids")
    .select("id, company_id, tender_id, tenders(id, title)")
    .eq("id", bidId)
    .single();

  if (!bid || bid.company_id !== access.companyId) {
    return NextResponse.json({ error: "Nemate pristup ovoj ponudi." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Fajl je obavezan." }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Fajl ne smije biti veci od 50 MB." }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Greska pri uploadu fajla." }, { status: 500 });
  }

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
    return NextResponse.json({ error: "Greska pri spremanju dokumenta." }, { status: 500 });
  }

  try {
    const extraction = await extractText(fileBuffer, file.type, file.name);

    await supabaseAdmin
      .from("tender_doc_uploads")
      .update({
        extracted_text: extraction.fullText,
        page_count: extraction.pageCount,
        status: "analyzing",
      })
      .eq("id", docUpload.id);

    const tenderData = bid.tenders as unknown as { id: string; title: string } | null;
    const analysis = await analyzeTenderDocumentation(extraction.fullText, tenderData?.title);

    const scannedAnnexes = scanForAnnexes(extraction.fullText);
    const missingAnnexes = mergeAnnexesIntoChecklist(analysis.checklist_items, scannedAnnexes);

    if (missingAnnexes.length > 0) {
      for (const annex of missingAnnexes) {
        analysis.checklist_items.push({
          name: annex.name,
          description: annex.description,
          document_type: "form",
          is_required: true,
          risk_note: null,
          page_number: annex.page_number,
          page_reference: annex.page_reference,
          source_text: annex.source_text,
        });
      }
    }

    await supabaseAdmin
      .from("tender_doc_uploads")
      .update({
        ai_analysis: analysis as unknown as Json,
        status: "ready",
      })
      .eq("id", docUpload.id);

    await rebuildChecklistFromAnalysis(supabase, supabaseAdmin, bidId, bid.company_id, analysis);

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
    const message = err instanceof Error ? err.message : "Greska pri analizi dokumenta.";
    console.error("Tender doc processing error:", err);

    await supabaseAdmin
      .from("tender_doc_uploads")
      .update({
        status: "error",
        error_message: message,
      })
      .eq("id", docUpload.id);

    return NextResponse.json({ error: message, doc_upload_id: docUpload.id }, { status: 500 });
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

  const access = await resolveBidAccess(supabase, user.id, bidId);
  if (!access) {
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

async function rebuildChecklistFromAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  bidId: string,
  companyId: string,
  analysis: TenderDocAnalysisResult,
) {
  await supabaseAdmin.from("bid_checklist_items").delete().eq("bid_id", bidId);
  await supabaseAdmin.from("bid_documents").delete().eq("bid_id", bidId);

  const { data: vaultDocs } = await supabase
    .from("documents")
    .select("id, type, expires_at")
    .eq("company_id", companyId);

  const checklistRows: BidChecklistItemInsert[] = analysis.checklist_items.map((item, index) => {
    let docId: string | null = null;
    let status: "missing" | "attached" = "missing";

    if (item.document_type) {
      const targetType = AI_TO_VAULT_TYPE_MAP[item.document_type];
      if (targetType) {
        const match = vaultDocs?.find(
          (doc) => doc.type === targetType && (!doc.expires_at || new Date(doc.expires_at) > new Date()),
        );

        if (match) {
          docId = match.id;
          status = "attached";
        }
      }
    }

    return {
      bid_id: bidId,
      title: item.name,
      description: item.description,
      status,
      document_id: docId,
      document_type: item.document_type,
      risk_note: item.risk_note || null,
      page_reference: item.page_reference || null,
      source_text: item.source_text || null,
      page_number: item.page_number ?? null,
      sort_order: index,
    };
  });

  if (checklistRows.length > 0) {
    await supabaseAdmin.from("bid_checklist_items").insert(checklistRows);

    const autoAttachedDocs = checklistRows
      .filter((row) => row.document_id)
      .map((row) => ({
        bid_id: bidId,
        document_id: row.document_id!,
        checklist_item_name: row.title,
        is_confirmed: false,
      }));

    if (autoAttachedDocs.length > 0) {
      await supabaseAdmin.from("bid_documents").insert(autoAttachedDocs);
    }
  }
}
