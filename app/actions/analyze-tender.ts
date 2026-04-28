"use server";

import { createClient } from "@/lib/supabase/server";
import { analyzeTender } from "@/lib/ai/tender-analysis";
import type { Tender } from "@/types/database";
import { getSubscriptionStatus } from "@/lib/subscription";

export async function analyzeTenderAction(tenderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Niste prijavljeni.");
  }

  // Check subscription and limits
  const { isSubscribed, plan } = await getSubscriptionStatus(user.id, user.email);
  
  if (!isSubscribed) {
    throw new Error("Morate imati aktivnu pretplatu za naprednu analizu.");
  }

  if (!plan.limits.features.advancedAnalysis) {
    throw new Error("Napredna analiza nije dostupna u vašem paketu. Nadogradite na Pro.");
  }

  // Fetch tender
  const { data: tenderData, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", tenderId)
    .single();

  if (error || !tenderData) {
    throw new Error("Tender nije pronađen.");
  }

  const tender = tenderData as Tender;

  // Run analysis (this handles caching internally)
  try {
    const analysis = await analyzeTender(tender);
    return analysis;
  } catch (err) {
    console.error("Analysis error:", err);
    throw new Error("Došlo je do greške prilikom napredne analize.");
  }
}
