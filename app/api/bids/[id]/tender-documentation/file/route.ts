import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Serve the tender documentation file for in-browser viewing.
 * Returns the raw PDF/DOCX bytes with proper content-type headers.
 */
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

  // Verify bid belongs to user
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

  // Get latest tender doc upload
  const supabaseAdmin = createAdminClient();
  const { data: uploads } = await supabaseAdmin
    .from("tender_doc_uploads")
    .select("file_path, content_type, file_name")
    .eq("bid_id", bidId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1);

  const upload = uploads?.[0];
  if (!upload) {
    return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });
  }

  // Download from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("documents")
    .download(upload.file_path);

  if (downloadError || !fileData) {
    console.error("Tender doc file download error:", downloadError);
    return NextResponse.json({ error: "Greška pri preuzimanju fajla." }, { status: 500 });
  }

  const buffer = await fileData.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": upload.content_type || "application/pdf",
      "Content-Disposition": `inline; filename="${upload.file_name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
