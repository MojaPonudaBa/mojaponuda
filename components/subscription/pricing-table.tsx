"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanTier } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface PricingTableProps {
  currentPlanId?: PlanTier;
  onSelectPlan: (planId: PlanTier) => Promise<void>;
  isLoading?: boolean;
  visiblePlanIds?: PlanTier[];
}

export function PricingTable({
  currentPlanId,
  onSelectPlan,
  isLoading = false,
  visiblePlanIds,
}: PricingTableProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const visiblePlans = (visiblePlanIds ?? (Object.keys(PLANS) as PlanTier[])).map((planId) => PLANS[planId]);

  async function handleSelect(planId: PlanTier) {
    setLoadingPlan(planId);
    try {
      await onSelectPlan(planId);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {visiblePlans.map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        const isPopular = plan.id === "pro";
        const requiresPortalDowngrade = plan.id === "basic" && Boolean(currentPlanId) && currentPlanId !== "basic";
        const loading = isLoading || loadingPlan === plan.id;

        return (
          <article
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-[1.85rem] border p-7 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)]",
              isPopular
                ? "border-sky-400/30 bg-[linear-gradient(180deg,#172554_0%,#111827_100%)]"
                : "border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]",
              isCurrent && "ring-1 ring-white/10",
            )}
          >
            {isPopular ? (
              <div className="absolute inset-x-0 -top-4 flex justify-center">
                <span className="rounded-full border border-sky-400/20 bg-sky-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                  Najbolji odnos kontrole i cijene
                </span>
              </div>
            ) : null}

            <div className="mb-8">
              <h3 className="font-heading text-xl font-bold text-white">{plan.name}</h3>
              <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-400">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm font-medium text-slate-400">KM / mjesečno</span>
              </div>
            </div>

            <ul className="mb-8 space-y-3.5 flex-1">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={cn(
                "h-12 w-full rounded-2xl px-5 text-sm font-semibold whitespace-nowrap",
                isCurrent
                  ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                  : isPopular
                    ? "bg-white text-slate-950 hover:bg-slate-100"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white",
              )}
              variant="outline"
              disabled={isCurrent || loading || requiresPortalDowngrade}
              onClick={() => handleSelect(plan.id)}
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isCurrent ? "Trenutni paket" : requiresPortalDowngrade ? "Downgrade kroz portal" : plan.cta || "Odaberi paket"}
            </Button>

            {plan.id === "agency" && !isCurrent ? (
              <p className="mt-3 text-center text-xs text-slate-400">Za agencije i konsultante</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
