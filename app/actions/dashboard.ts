"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface GlobalSearchResult {
  id: string;
  type: "tender" | "buyer" | "cpv" | "document";
  title: string;
  subtitle: string;
  href: string;
}

export async function skipDashboardDecisionAction(input: {
  tenderId: string;
  reason: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Morate biti prijavljeni." };

    const { error } = await supabase.from("ai_feedback").insert({
      user_id: user.id,
      target_id: input.tenderId,
      surface: "dashboard_decision_queue",
      signal: "skip",
      reason: input.reason,
      metadata: { route: "/dashboard" } satisfies Json,
    });

    if (error) return { ok: false, error: "Nije moguće sačuvati razlog preskakanja." };

    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Greška pri čuvanju odluke." };
  }
}

export async function markDashboardDecisionPositiveAction(tenderId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Morate biti prijavljeni." };

    await supabase.from("ai_feedback").insert({
      user_id: user.id,
      target_id: tenderId,
      surface: "dashboard_decision_queue",
      signal: "add_to_pipeline",
      reason: "dodano u pipeline",
      metadata: { route: "/dashboard" } satisfies Json,
    });

    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Greška pri čuvanju povratne informacije." };
  }
}

export async function persistOnboardingCompletionAction(input: {
  completedItems: string[];
  computedCompletion: Json;
  percent: number;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Morate biti prijavljeni." };

    const { data: existing } = await supabase
      .from("user_onboarding")
      .select("confetti_shown_at, dismissed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const shouldMarkConfetti = input.percent >= 100 && !existing?.confetti_shown_at;

    const { error } = await supabase.from("user_onboarding").upsert({
      user_id: user.id,
      completed_items: input.completedItems,
      computed_completion: input.computedCompletion,
      confetti_shown_at: shouldMarkConfetti ? new Date().toISOString() : existing?.confetti_shown_at ?? null,
      dismissed_at: existing?.dismissed_at ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) return { ok: false, error: "Nije moguće sačuvati onboarding napredak." };

    revalidatePath("/dashboard");
    return { ok: true, showConfetti: shouldMarkConfetti };
  } catch {
    return { ok: false, error: "Greška pri čuvanju onboarding napretka." };
  }
}

export async function globalDashboardSearchAction(query: string): Promise<GlobalSearchResult[]> {
  try {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return [];
    const searchQuery = normalizedQuery.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
    if (searchQuery.length < 2) return [];

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id);
    const companyIds = (companies ?? []).map((company) => company.id);

    const [tendersResult, buyersResult, docsResult] = await Promise.all([
      supabase
        .from("tenders")
        .select("id, title, portal_id, contracting_authority")
        .or(`title.ilike.%${searchQuery}%,portal_id.ilike.%${searchQuery}%`)
        .limit(6),
      supabase
        .from("contracting_authorities")
        .select("id, name, jib, city")
        .or(`name.ilike.%${searchQuery}%,jib.ilike.%${searchQuery}%`)
        .limit(4),
      companyIds.length > 0
        ? supabase
            .from("documents")
            .select("id, name, type")
            .in("company_id", companyIds)
            .ilike("name", `%${searchQuery}%`)
            .limit(4)
        : Promise.resolve({ data: [] }),
    ]);

    const tenderRows = tendersResult.data ?? [];
    const buyerRows = buyersResult.data ?? [];
    const documentRows = docsResult.data ?? [];
    const cpvResults = /^\d{2,8}$/.test(normalizedQuery)
      ? [{ id: normalizedQuery, type: "cpv" as const, title: `CPV ${normalizedQuery}`, subtitle: "Otvori CPV klasifikaciju", href: `/dashboard/cpv?code=${encodeURIComponent(normalizedQuery)}` }]
      : [];

    return [
      ...tenderRows.map((tender) => ({
        id: tender.id,
        type: "tender" as const,
        title: tender.title,
        subtitle: tender.contracting_authority ?? tender.portal_id ?? "Tender",
        href: `/dashboard/tenders/${tender.id}`,
      })),
      ...buyerRows.map((buyer) => ({
        id: buyer.id,
        type: "buyer" as const,
        title: buyer.name ?? buyer.jib ?? "Naručilac",
        subtitle: buyer.city ?? buyer.jib ?? "Contracting authority",
        href: buyer.jib ? `/dashboard/intelligence/authority/${buyer.jib}` : "/dashboard/trziste",
      })),
      ...cpvResults,
      ...documentRows.map((document) => ({
        id: document.id,
        type: "document" as const,
        title: document.name,
        subtitle: document.type ?? "Dokument",
        href: "/dashboard/vault",
      })),
    ].slice(0, 12);
  } catch {
    return [];
  }
}
