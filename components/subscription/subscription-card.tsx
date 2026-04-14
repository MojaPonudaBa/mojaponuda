"use client";

import { useState } from "react";
import { CheckCircle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PreparationUsageSummary } from "@/lib/preparation-credits";
import type { Plan } from "@/lib/plans";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivna",
  past_due: "Uplata kasni",
  cancelled: "Otkazana",
  paused: "Pauzirana",
  unpaid: "Neplaćena",
  inactive: "Neaktivna",
};

const STATUS_COLORS: Record<string, string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  past_due: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  cancelled: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  paused: "border-slate-500/25 bg-slate-500/10 text-slate-200",
  unpaid: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  inactive: "border-white/10 bg-white/5 text-slate-200",
};

interface SubscriptionCardProps {
  isActive: boolean;
  status: string;
  currentPeriodEnd: string | null;
  hasCustomerId: boolean;
  plan?: Plan;
  showPortal?: boolean;
  preparationSummary?: PreparationUsageSummary | null;
}

function formatLongDate(dateValue: string | null) {
  if (!dateValue) return "Nije dostupno";

  return new Date(dateValue).toLocaleDateString("bs-Latn-BA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionCard({
  isActive,
  status,
  currentPeriodEnd,
  hasCustomerId,
  plan,
  showPortal = true,
  preparationSummary,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePortal() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/lemonsqueezy/customer-portal", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Greška pri otvaranju korisničkog portala.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  const displayStatus = isActive ? status : "inactive";
  const displayPlanName = isActive && plan ? plan.name : "Besplatni nalog";

  return (
    <section className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-8 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex size-12 items-center justify-center rounded-2xl border ${
              isActive
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-slate-400"
            }`}
          >
            {isActive ? <CheckCircle className="size-6" /> : <XCircle className="size-6" />}
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">{displayPlanName}</h2>
            <div
              className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                STATUS_COLORS[displayStatus] ?? STATUS_COLORS.inactive
              }`}
            >
              {STATUS_LABELS[displayStatus] ?? displayStatus}
            </div>
          </div>
        </div>

        {showPortal && hasCustomerId ? (
          <Button
            variant="outline"
            onClick={handlePortal}
            disabled={loading}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 size-4" />
            )}
            Upravljaj pretplatom
          </Button>
        ) : null}
      </div>

      <div className={`mt-6 grid gap-4 ${preparationSummary ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Šta to znači za vaš rad
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {isActive
              ? `Trenutno koristite paket ${displayPlanName}. U njemu imate pristup alatima i pripremama koje su uključene u vaš paket.`
              : "Trenutno ste na besplatnom nivou. Možete pratiti prilike za svoju firmu, a puni rad na ponudama uključujete kada vam zatreba."}
          </p>
        </div>

        {isActive && currentPeriodEnd ? (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Sljedeća obnova
            </p>
            <p className="mt-3 text-xl font-semibold text-white">{formatLongDate(currentPeriodEnd)}</p>
          </div>
        ) : null}

        {preparationSummary ? (
          <div className="rounded-[1.4rem] border border-blue-400/15 bg-blue-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              Pripreme u ciklusu
            </p>
            <p className="mt-3 text-xl font-semibold text-white">
              {preparationSummary.totalRemaining} dostupno
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              {preparationSummary.includedRemaining} uključenih i {preparationSummary.purchasedRemaining} kupljenih priprema spremno je za rad.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              Ciklus traje do {formatLongDate(preparationSummary.cycle?.end ?? currentPeriodEnd)}
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-medium text-rose-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}
