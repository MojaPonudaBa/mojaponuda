import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 403 });
  }

  const body = await request.json();
  const { tender_id, tender_title, contracting_authority } = body;

  if (!tender_id && !tender_title) {
    return NextResponse.json(
      { error: "Unesite tender ili naziv tendera." },
      { status: 400 }
    );
  }

  let resolvedTenderId = tender_id;

  // Ako nema tender_id, kreiraj tender ručno
  if (!resolvedTenderId && tender_title) {
    const portalId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { data: newTender, error: tenderError } = await supabase
      .from("tenders")
      .insert({
        portal_id: portalId,
        title: tender_title.trim(),
        contracting_authority: contracting_authority?.trim() || null,
        status: "manual",
      })
      .select("id")
      .single();

    if (tenderError) {
      console.error("Tender create error:", tenderError);
      return NextResponse.json(
        { error: "Greška pri kreiranju tendera." },
        { status: 500 }
      );
    }

    resolvedTenderId = newTender.id;
  }

  // Kreiraj ponudu
  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .insert({
      company_id: company.id,
      tender_id: resolvedTenderId,
      status: "draft",
    })
    .select("id")
    .single();

  if (bidError) {
    console.error("Bid create error:", bidError);
    return NextResponse.json(
      { error: "Greška pri kreiranju ponude." },
      { status: 500 }
    );
  }

  return NextResponse.json({ bid }, { status: 201 });
}
