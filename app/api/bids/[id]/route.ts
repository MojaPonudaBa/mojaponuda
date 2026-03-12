import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 403 });
  }

  // Provjeri vlasništvo
  const { data: bid } = await supabase
    .from("bids")
    .select("id, company_id")
    .eq("id", id)
    .single();

  if (!bid || bid.company_id !== company.id) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nema podataka za ažuriranje." }, { status: 400 });
  }

  const { error } = await supabase
    .from("bids")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Bid update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju ponude." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
