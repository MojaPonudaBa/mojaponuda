import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPreparationPacksForPlan,
  type Plan,
  type PreparationPack,
} from "@/lib/plans";
import type {
  Database,
  PreparationCreditPurchase,
  Subscription,
} from "@/types/database";

type TypedClient = SupabaseClient<Database>;

export interface PreparationBillingCycle {
  start: string;
  end: string;
}

export interface PreparationUsageSummary {
  planId: Plan["id"];
  companyId: string;
  scope: Plan["preparation"]["scope"];
  scopeLabel: string;
  monthlyLabel: string;
  cycle: PreparationBillingCycle | null;
  includedLimit: number;
  includedUsed: number;
  includedRemaining: number;
  purchasedTotal: number;
  purchasedUsed: number;
  purchasedRemaining: number;
  totalRemaining: number;
  payAsYouGoPrice: number | null;
  packs: PreparationPack[];
}

export type PreparationClaimResult =
  | {
      ok: true;
      consumptionId: string | null;
      source: "included" | "purchased" | "legacy_unlock" | "complimentary";
    }
  | {
      ok: false;
      code: "PREPARATION_CREDITS_REQUIRED";
      message: string;
      summary: PreparationUsageSummary;
    };

function startOfMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function subtractOneMonth(date: Date) {
  const value = new Date(date);
  value.setUTCMonth(value.getUTCMonth() - 1);
  return value;
}

export function getPreparationBillingCycle(
  subscription: Subscription | null | undefined,
  now = new Date(),
): PreparationBillingCycle | null {
  if (subscription?.current_period_end) {
    const end = new Date(subscription.current_period_end);
    if (!Number.isNaN(end.getTime()) && end.getTime() > now.getTime()) {
      const start = subtractOneMonth(end);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  return {
    start: startOfMonth(now).toISOString(),
    end: endOfMonth(now).toISOString(),
  };
}

async function loadPurchasedBalances(
  supabase: TypedClient,
  userId: string,
  companyId: string,
) {
  const { data: purchasesData } = await supabase
    .from("preparation_credit_purchases")
    .select("id, credits_granted, created_at, status")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("status", "paid")
    .order("created_at", { ascending: true });

  const purchases = (purchasesData ?? []) as Array<
    Pick<PreparationCreditPurchase, "id" | "credits_granted" | "created_at" | "status">
  >;

  if (purchases.length === 0) {
    return {
      purchases,
      usedByPurchase: new Map<string, number>(),
      purchasedTotal: 0,
      purchasedUsed: 0,
      purchasedRemaining: 0,
    };
  }

  const purchaseIds = purchases.map((purchase) => purchase.id);
  const { data: purchasedConsumptions } = await supabase
    .from("preparation_consumptions")
    .select("purchase_id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .in("purchase_id", purchaseIds);

  const usedByPurchase = new Map<string, number>();
  for (const row of purchasedConsumptions ?? []) {
    if (!row.purchase_id) continue;
    usedByPurchase.set(row.purchase_id, (usedByPurchase.get(row.purchase_id) ?? 0) + 1);
  }

  const purchasedTotal = purchases.reduce((sum, purchase) => sum + purchase.credits_granted, 0);
  const purchasedUsed = Array.from(usedByPurchase.values()).reduce((sum, value) => sum + value, 0);
  const purchasedRemaining = Math.max(purchasedTotal - purchasedUsed, 0);

  return {
    purchases,
    usedByPurchase,
    purchasedTotal,
    purchasedUsed,
    purchasedRemaining,
  };
}

export async function getPreparationUsageSummary(
  supabase: TypedClient,
  {
    userId,
    companyId,
    plan,
    subscription,
  }: {
    userId: string;
    companyId: string;
    plan: Plan;
    subscription?: Subscription | null;
  },
): Promise<PreparationUsageSummary> {
  const cycle = getPreparationBillingCycle(subscription ?? null);

  let includedUsed = 0;
  if (cycle && plan.preparation.includedPerCycle > 0) {
    const { count } = await supabase
      .from("preparation_consumptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("source", "included")
      .gte("created_at", cycle.start)
      .lt("created_at", cycle.end);

    includedUsed = count ?? 0;
  }

  const includedLimit = plan.preparation.includedPerCycle;
  const includedRemaining = Math.max(includedLimit - includedUsed, 0);
  const purchased = await loadPurchasedBalances(supabase, userId, companyId);

  return {
    planId: plan.id,
    companyId,
    scope: plan.preparation.scope,
    scopeLabel: plan.preparation.scope === "company" ? "za ovu firmu" : "na racunu",
    monthlyLabel: plan.preparation.monthlyLabel,
    cycle,
    includedLimit,
    includedUsed,
    includedRemaining,
    purchasedTotal: purchased.purchasedTotal,
    purchasedUsed: purchased.purchasedUsed,
    purchasedRemaining: purchased.purchasedRemaining,
    totalRemaining: includedRemaining + purchased.purchasedRemaining,
    payAsYouGoPrice: plan.preparation.payAsYouGoPrice,
    packs: getPreparationPacksForPlan(plan.id),
  };
}

export async function claimPreparationAccess(
  supabase: TypedClient,
  {
    userId,
    companyId,
    bidId,
    tenderId,
    plan,
    subscription,
  }: {
    userId: string;
    companyId: string;
    bidId: string;
    tenderId: string;
    plan: Plan;
    subscription?: Subscription | null;
  },
): Promise<PreparationClaimResult> {
  if (plan.id === "basic") {
    return {
      ok: false,
      code: "PREPARATION_CREDITS_REQUIRED",
      message: "Priprema ponude nije dostupna na besplatnom paketu.",
      summary: await getPreparationUsageSummary(supabase, {
        userId,
        companyId,
        plan,
        subscription,
      }),
    };
  }

  if (plan.id === "starter") {
    const { data: legacyUnlock } = await supabase
      .from("unlocked_tenders")
      .select("id")
      .eq("user_id", userId)
      .eq("tender_id", tenderId)
      .eq("status", "paid")
      .maybeSingle();

    if (legacyUnlock) {
      const { data: consumption, error } = await supabase
        .from("preparation_consumptions")
        .insert({
          user_id: userId,
          company_id: companyId,
          bid_id: bidId,
          source: "legacy_unlock",
        })
        .select("id")
        .single();

      if (error) {
        return {
          ok: false,
          code: "PREPARATION_CREDITS_REQUIRED",
          message: "Nismo uspjeli evidentirati pristup za ovaj tender.",
          summary: await getPreparationUsageSummary(supabase, {
            userId,
            companyId,
            plan,
            subscription,
          }),
        };
      }

      return {
        ok: true,
        consumptionId: consumption.id,
        source: "legacy_unlock",
      };
    }
  }

  const summary = await getPreparationUsageSummary(supabase, {
    userId,
    companyId,
    plan,
    subscription,
  });

  if (summary.includedRemaining > 0 && summary.cycle) {
    const { data: consumption, error } = await supabase
      .from("preparation_consumptions")
      .insert({
        user_id: userId,
        company_id: companyId,
        bid_id: bidId,
        source: "included",
        billing_cycle_start: summary.cycle.start,
        billing_cycle_end: summary.cycle.end,
      })
      .select("id")
      .single();

    if (!error) {
      return {
        ok: true,
        consumptionId: consumption.id,
        source: "included",
      };
    }
  }

  const purchased = await loadPurchasedBalances(supabase, userId, companyId);
  const purchaseWithRemaining = purchased.purchases.find((purchase) => {
    const used = purchased.usedByPurchase.get(purchase.id) ?? 0;
    return purchase.credits_granted - used > 0;
  });

  if (purchaseWithRemaining) {
    const { data: consumption, error } = await supabase
      .from("preparation_consumptions")
      .insert({
        user_id: userId,
        company_id: companyId,
        bid_id: bidId,
        purchase_id: purchaseWithRemaining.id,
        source: "purchased",
      })
      .select("id")
      .single();

    if (!error) {
      return {
        ok: true,
        consumptionId: consumption.id,
        source: "purchased",
      };
    }
  }

  return {
    ok: false,
    code: "PREPARATION_CREDITS_REQUIRED",
    message:
      plan.id === "starter"
        ? "Nemate dostupnu pripremu. Kupite novu pripremu ili paket priprema za nastavak."
        : "Iskoristili ste ukljucene pripreme za ovaj ciklus. Dodajte novi paket priprema za nastavak.",
    summary,
  };
}
