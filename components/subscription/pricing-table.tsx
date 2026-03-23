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
}

export function PricingTable({
  currentPlanId,
  onSelectPlan,
  isLoading = false,
}: PricingTableProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);

  const handleSelect = async (planId: PlanTier) => {
    setLoadingPlan(planId);
    try {
      await onSelectPlan(planId);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {(Object.values(PLANS) as Array<typeof PLANS[keyof typeof PLANS]>).map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        const isPopular = plan.id === "pro";
        const loading = isLoading || loadingPlan === plan.id;

        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-white p-8 shadow-sm transition-all hover:shadow-md",
              isPopular
                ? "border-primary ring-1 ring-primary shadow-blue-500/10"
                : "border-slate-200",
              isCurrent && "bg-slate-50/50"
            )}
          >
            {isPopular && (
              <div className="absolute -top-4 inset-x-0 flex justify-center">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  Najbolji odnos kontrole i cijene
                </span>
              </div>
            )}

            <div className="mb-8">
              <h3 className="font-heading text-lg font-bold text-slate-900">
                {plan.name}
              </h3>
              <p className="mt-2 text-sm text-slate-500 min-h-[40px]">
                {plan.description}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-slate-900">
                  {plan.price}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  KM / mjesečno
                </span>
              </div>
            </div>

            <ul className="mb-8 space-y-4 flex-1">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <Check className="size-5 shrink-0 text-emerald-500" />
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={cn(
                "w-full rounded-xl font-bold h-11",
                isPopular ? "shadow-lg shadow-blue-500/20" : ""
              )}
              variant={isCurrent ? "outline" : isPopular ? "default" : "outline"}
              disabled={isCurrent || loading}
              onClick={() => handleSelect(plan.id)}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {isCurrent
                ? "Trenutni paket"
                : plan.cta || "Odaberi paket"}
            </Button>
            
            {plan.id === "agency" && !isCurrent && (
                 <p className="mt-3 text-center text-xs text-slate-500">
                   Za agencije i konsultante
                 </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
