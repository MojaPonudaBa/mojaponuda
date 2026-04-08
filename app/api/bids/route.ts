import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveManagedCompanyAccess } from "@/lib/bids/access";
import { ensureBidChecklist } from "@/lib/bids/checklist";
import { getSubscriptionStatus } from "@/lib/subscription";
import type { Tender } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { isSubscribed, plan } = await getSubscriptionStatus(user.id, user.email);

  if (!isSubscribed) {
    return NextResponse.json(
      {
        error: "Priprema ponude je dostupna samo uz aktivnu pretplatu.",
        code: "SUBSCRIPTION_REQUIRED",
        upgradeRequired: true,
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const {
    tender_id,
    tender_title,
    contracting_authority,
    auto_generate_checklist,
    agency_client_id,
  } = body;

  const access = await resolveManagedCompanyAccess(
    supabase,
    user.id,
    typeof agency_client_id === "string" ? agency_client_id : null,
  );

  if (!access) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 403 });
  }

  const { count: activeBidsCount, error: countError } = await supabase
    .from("bids")
    .select("*", { count: "exact", head: true })
    .eq("company_id", access.companyId)
    .in("status", ["draft", "in_review", "submitted"]);

  if (countError) {
    console.error("Error counting bids:", countError);
    return NextResponse.json({ error: "Greška pri provjeri limita." }, { status: 500 });
  }

  if ((activeBidsCount || 0) >= plan.limits.maxActiveTenders) {
    return NextResponse.json(
      {
        error: "Dostigli ste limit aktivnih tendera za vaš paket.",
        code: "LIMIT_REACHED",
        limit: plan.limits.maxActiveTenders,
        current: activeBidsCount,
        upgradeRequired: true,
      },
      { status: 403 },
    );
  }

  if (!tender_id && !tender_title) {
    return NextResponse.json({ error: "Unesite tender ili naziv tendera." }, { status: 400 });
  }

  let resolvedTenderId = tender_id;

  if (!resolvedTenderId && tender_title) {
    const portalId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const supabaseAdmin = createAdminClient();

    const { data: newTender, error: tenderError } = await supabaseAdmin
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
      return NextResponse.json({ error: "Greška pri kreiranju tendera." }, { status: 500 });
    }

    resolvedTenderId = newTender.id;
  }

  if (!resolvedTenderId) {
    return NextResponse.json({ error: "Tender nije pronađen." }, { status: 400 });
  }

  if (plan.id === "starter") {
    const { data: unlockedTender } = await supabase
      .from("unlocked_tenders")
      .select("id")
      .eq("user_id", user.id)
      .eq("tender_id", resolvedTenderId)
      .eq("status", "paid")
      .maybeSingle();

    if (!unlockedTender) {
      return NextResponse.json(
        {
          error: "Priprema ponude za ovaj tender nije otključana.",
          code: "PAYWALL_REQUIRED",
          tenderId: resolvedTenderId,
        },
        { status: 403 },
      );
    }
  }

  const { data: tenderData, error: tenderError } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", resolvedTenderId)
    .single();

  if (tenderError || !tenderData) {
    return NextResponse.json({ error: "Tender nije pronađen." }, { status: 404 });
  }

  const tender = tenderData as Tender;

  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .insert({
      company_id: access.companyId,
      tender_id: resolvedTenderId,
      status: "draft",
    })
    .select("id")
    .single();

  if (bidError) {
    console.error("Bid create error:", bidError);
    return NextResponse.json({ error: "Greška pri kreiranju ponude." }, { status: 500 });
  }

  if (auto_generate_checklist) {
    const checklist = await ensureBidChecklist({
      bidId: bid.id,
      companyId: access.companyId,
      tender,
      allowAI: isSubscribed && (plan.limits.features.advancedAnalysis || plan.id === "starter"),
    });

    return NextResponse.json(
      {
        bid,
        checklist_items_added: checklist.checklistItemsAdded,
        auto_attached: checklist.autoAttached,
        checklist_source: checklist.source,
      },
      { status: 201 },
    );
  }

  return NextResponse.json({ bid }, { status: 201 });
}
