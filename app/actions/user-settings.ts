"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const RECOMMENDATION_WEIGHT_KEYS = [
  "industryFit",
  "buyerHistory",
  "similarProjects",
  "tenderValue",
  "deadline",
  "competition",
] as const;

export async function updateRecommendationWeightsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const weights: Record<string, number> = {};
  for (const key of RECOMMENDATION_WEIGHT_KEYS) {
    const value = Number(formData.get(key) ?? 0);
    weights[key] = Number.isFinite(value) ? Math.max(0, Math.min(50, Math.round(value))) : 0;
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total !== 100) {
    throw new Error("Težine preporuka moraju ukupno iznositi 100%.");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_settings")
      .update({ recommendation_weights: weights as Json, company_id: company?.id ?? null })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("user_settings")
      .insert({
        user_id: user.id,
        company_id: company?.id ?? null,
        recommendation_weights: weights as Json,
      });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/tenders");
}
