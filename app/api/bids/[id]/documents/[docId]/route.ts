import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBidAccess } from "@/lib/bids/access";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  const access = await resolveBidAccess(supabase, user.id, id);
  if (!access) {
    return NextResponse.json({ error: "Ponuda nije pronadjena." }, { status: 404 });
  }

  const { error } = await supabase
    .from("bid_documents")
    .delete()
    .eq("id", docId)
    .eq("bid_id", id);

  if (error) {
    return NextResponse.json({ error: "Greska pri uklanjanju dokumenta." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
