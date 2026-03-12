import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifyBidOwnership(supabase: Awaited<ReturnType<typeof createClient>>, bidId: string, userId: string) {
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!company) return null;

  const { data: bid } = await supabase
    .from("bids")
    .select("id, company_id")
    .eq("id", bidId)
    .single();

  if (!bid || bid.company_id !== company.id) return null;
  return company;
}

export async function GET(
  _request: NextRequest,
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

  const company = await verifyBidOwnership(supabase, id, user.id);
  if (!company) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("bid_checklist_items")
    .select("*")
    .eq("bid_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ items: items ?? [] });
}

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

  const company = await verifyBidOwnership(supabase, id, user.id);
  if (!company) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const body = await request.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Naziv stavke je obavezan." }, { status: 400 });
  }

  // Dobij max sort_order
  const { data: maxItem } = await supabase
    .from("bid_checklist_items")
    .select("sort_order")
    .eq("bid_id", id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxItem?.sort_order ?? -1) + 1;

  const { data: item, error } = await supabase
    .from("bid_checklist_items")
    .insert({
      bid_id: id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      risk_note: body.risk_note?.trim() || null,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("Checklist insert error:", error);
    return NextResponse.json({ error: "Greška pri dodavanju stavke." }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
