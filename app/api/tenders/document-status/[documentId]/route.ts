import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { data: document } = await supabase
    .from("tender_source_documents" as any)
    .select("processing_status, page_count, processing_error, tender_id")
    .eq("id", documentId)
    .single();

  if (!document) {
    return NextResponse.json(
      { error: "Dokument nije pronađen." },
      { status: 404 }
    );
  }

  // Get analysis if complete
  let requirementsCount = 0;
  if (document.processing_status === "complete") {
    const { data: tender } = await supabase
      .from("tenders")
      .select("ai_analysis")
      .eq("id", document.tender_id)
      .single();

    if (tender?.ai_analysis) {
      const analysis = tender.ai_analysis as any;
      requirementsCount =
        analysis.document_analysis?.total_requirements_found || 0;
    }
  }

  return NextResponse.json({
    status: document.processing_status,
    pageCount: document.page_count,
    error: document.processing_error,
    requirementsCount,
  });
}
