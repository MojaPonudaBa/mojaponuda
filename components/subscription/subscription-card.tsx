"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { Plan } from "@/lib/plans";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivna",
  past_due: "Dospjela uplata",
  cancelled: "Otkazana",
  paused: "Pauzirana",
  unpaid: "Neplaćena",
  inactive: "Neaktivna",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-600 bg-emerald-50 border-emerald-100",
  past_due: "text-amber-600 bg-amber-50 border-amber-100",
  cancelled: "text-red-600 bg-red-50 border-red-100",
  paused: "text-slate-600 bg-slate-50 border-slate-100",
  unpaid: "text-red-600 bg-red-50 border-red-100",
  inactive: "text-slate-500 bg-slate-50 border-slate-100",
};

interface SubscriptionCardProps {
  isActive: boolean;
  status: string;
  currentPeriodEnd: string | null;
  hasCustomerId: boolean;
  plan?: Plan;
}

export function SubscriptionCard({
  isActive,
  status,
  currentPeriodEnd,
  hasCustomerId,
  plan,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lemonsqueezy/customer-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Greška pri otvaranju portala.");
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
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex size-12 items-center justify-center rounded-xl ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
            {isActive ? <CheckCircle className="size-6" /> : <XCircle className="size-6" />}
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">
              {displayPlanName}
            </h2>
            <div className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[displayStatus] ?? "text-slate-500 bg-slate-50 border-slate-100"}`}>
              {STATUS_LABELS[displayStatus] ?? displayStatus}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
        <p className="text-sm font-medium text-slate-500">Šta to znači za vaš rad</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          {isActive
            ? `Trenutno imate pristup paketu ${displayPlanName}, što znači više kontrole prije slanja ponude i pristup premium tržišnim uvidima.`
            : "Trenutno ste na besplatnom nivou: možete pregledati tendera i postaviti profil, a pripremu ponude i premium uvide otključavate kada vam zatrebaju."}
        </p>
      </div>

      {isActive && currentPeriodEnd && (
        <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Sljedeća obnova</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {new Date(currentPeriodEnd).toLocaleDateString("bs-Latn-BA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
      )}

      {hasCustomerId && (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <Button
            className="w-full sm:w-auto rounded-xl font-bold h-11"
            variant="outline"
            onClick={handlePortal}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 size-4" />
            )}
            Upravljaj pretplatom
          </Button>
        </div>
      )}
    </div>
  );
}

