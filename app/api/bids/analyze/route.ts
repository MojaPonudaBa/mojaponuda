import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ensureBidChecklist } from "@/lib/bids/checklist";
import type { Bid, Tender, Company } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }
  
  // Provjera pretplate i feature-a
  const { isSubscribed, plan } = await getSubscriptionStatus(user.id, user.email);
  
  if (!isSubscribed) {
    return NextResponse.json(
      { error: "Morate imati aktivnu pretplatu za naprednu analizu." },
      { status: 403 }
    );
  }

  if (!plan.limits.features.advancedAnalysis) {
    return NextResponse.json(
      { 
        error: "Napredna analiza nije dostupna u vašem paketu.",
        code: "FEATURE_LOCKED",
        feature: "advancedAnalysis",
        upgradeRequired: true
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { bid_id } = body;

  if (!bid_id) {
    return NextResponse.json(
      { error: "bid_id je obavezan." },
      { status: 400 }
    );
  }

  // Dohvati firmu
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) {
    return NextResponse.json(
      { error: "Firma nije pronađena." },
      { status: 403 }
    );
  }

  // Dohvati ponudu s tenderom
  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", bid_id)
    .single();

  const bid = bidData as unknown as (Bid & { tenders: Tender }) | null;

  if (!bid || bid.company_id !== company.id) {
    return NextResponse.json(
      { error: "Ponuda nije pronađena." },
      { status: 404 }
    );
  }

  const tender = bid.tenders;

  try {
    const checklist = await ensureBidChecklist({
      bidId: bid_id,
      companyId: company.id,
      tender,
      allowAI: true,
    });

    return NextResponse.json({
      analysis: checklist.analysis,
      checklist_items_added: checklist.checklistItemsAdded,
      auto_attached: checklist.autoAttached,
      checklist_source: checklist.source,
    });
  } catch (err) {
    console.error("AI analysis error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Napredna analiza nije uspjela: ${message}` },
      { status: 500 }
    );
  }
}
