import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBidAccess } from "@/lib/bids/access";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;
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

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.document_id !== undefined) updates.document_id = body.document_id;
  if (body.risk_note !== undefined) updates.risk_note = body.risk_note;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data: item, error } = await supabase
    .from("bid_checklist_items")
    .update(updates)
    .eq("id", itemId)
    .eq("bid_id", id)
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "Greska pri azuriranju stavke." }, { status: 500 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;
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
    .from("bid_checklist_items")
    .delete()
    .eq("id", itemId)
    .eq("bid_id", id);

  if (error) {
    return NextResponse.json({ error: "Greska pri brisanju stavke." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
