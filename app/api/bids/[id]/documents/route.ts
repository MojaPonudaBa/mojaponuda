import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  const body = await request.json();
  const { document_id, checklist_item_name } = body;

  if (!document_id) {
    return NextResponse.json({ error: "document_id je obavezan." }, { status: 400 });
  }

  // Provjeri da dokument ne postoji već
  const { data: existing } = await supabase
    .from("bid_documents")
    .select("id")
    .eq("bid_id", id)
    .eq("document_id", document_id)
    .single();

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
