import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBidAccess } from "@/lib/bids/access";

export async function PATCH(
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
    return NextResponse.json({ error: "Ponuda nije pronadjena." }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nema podataka za azuriranje." }, { status: 400 });
  }

  const { error } = await supabase.from("bids").update(updates).eq("id", id).eq("company_id", access.companyId);

  if (error) {
    console.error("Bid update error:", error);
    return NextResponse.json({ error: "Greska pri azuriranju ponude." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
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
    return NextResponse.json({ error: "Ponuda nije pronadjena." }, { status: 404 });
  }

  const { error } = await supabase.from("bids").delete().eq("id", id).eq("company_id", access.companyId);

  if (error) {
    console.error("Bid delete error:", error);
    return NextResponse.json({ error: "Greska pri brisanju ponude." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
