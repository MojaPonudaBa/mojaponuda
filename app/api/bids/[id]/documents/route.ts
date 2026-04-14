import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBidAccess } from "@/lib/bids/access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  const access = await resolveBidAccess(supabase, user.id, id);
  if (!access) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const body = await request.json();
  const { document_id, checklist_item_name } = body;

  if (!document_id) {
    return NextResponse.json({ error: "document_id je obavezan." }, { status: 400 });
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", document_id)
    .eq("company_id", access.companyId)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("bid_documents")
    .select("id")
    .eq("bid_id", id)
    .eq("document_id", document_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Dokument je već priložen." }, { status: 409 });
  }

  const { data: bidDoc, error } = await supabase
    .from("bid_documents")
    .insert({
      bid_id: id,
      document_id,
      checklist_item_name: checklist_item_name || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Bid document insert error:", error);
    return NextResponse.json({ error: "Greška pri prilaganju dokumenta." }, { status: 500 });
  }

  return NextResponse.json({ bidDoc }, { status: 201 });
}
