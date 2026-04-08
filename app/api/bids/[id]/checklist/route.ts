import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBidAccess } from "@/lib/bids/access";

export async function GET(
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

  const { data: items } = await supabase
    .from("bid_checklist_items")
    .select("*")
    .eq("bid_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ items: items ?? [] });
}

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
    return NextResponse.json({ error: "Ponuda nije pronadjena." }, { status: 404 });
  }

  const body = await request.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Naziv stavke je obavezan." }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Greska pri dodavanju stavke." }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
