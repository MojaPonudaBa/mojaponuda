"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, Loader2, CheckCircle, XCircle, Sparkles } from "lucide-react";

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
}

export function SubscriptionCard({
  isActive,
  status,
  currentPeriodEnd,
  hasCustomerId,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Greška pri kreiranju narudžbe.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

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

  if (isActive) {
    return (
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="size-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                MojaPonuda Pro
              </h2>
              <div className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[status] ?? "text-slate-500 bg-slate-50 border-slate-100"}`}>
                {STATUS_LABELS[status] ?? status}
              </div>
            </div>
          </div>
        </div>

        {currentPeriodEnd && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-sm font-medium text-slate-500">Sljedeća obnova</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900">
              {new Date(currentPeriodEnd).toLocaleDateString("bs-BA", {
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

        <div className="mt-8 pt-6 border-t border-slate-100">
          <Button
            className="w-full sm:w-auto rounded-xl font-bold h-11"
            variant="outline"
            onClick={handlePortal}
            disabled={loading || !hasCustomerId}
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 size-4" />
            )}
            Upravljaj pretplatom
          </Button>
        </div>
      </div>
    );
  }

  // Neaktivna pretplata — prikaz ponude
  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <XCircle className="size-6" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-900">
            MojaPonuda Pro
          </h2>
          <div className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[status] ?? "text-slate-500 bg-slate-50 border-slate-100"}`}>
            {STATUS_LABELS[status] ?? status}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-primary/10 bg-blue-50/30 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="size-24 text-primary" />
        </div>
        
        <div className="flex items-baseline gap-2 mb-4 relative z-10">
          <span className="font-heading text-4xl font-extrabold text-slate-900">80 EUR</span>
          <span className="text-sm font-bold text-slate-500 uppercase">/ mjesečno</span>
        </div>
        
        <ul className="space-y-3 relative z-10">
          <li className="flex items-center gap-3">
            <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="size-3 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Neograničen broj ponuda</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="size-3 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">AI analiza tendera i ekstrakcija</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="size-3 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Izvoz kompletnog PDF paketa</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="size-3 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Napredna tržišna analitika</span>
          </li>
        </ul>
      </div>

      {error && (
        <p className="mt-4 text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Button
          className="w-full rounded-xl font-bold h-12 text-base shadow-lg shadow-blue-500/20"
          onClick={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <CreditCard className="mr-2 size-5" />
          )}
          Aktiviraj Pro pretplatu
        </Button>

        {hasCustomerId && (
          <Button
            className="w-full rounded-xl font-bold h-11"
            variant="ghost"
            onClick={handlePortal}
            disabled={loading}
          >
            <ExternalLink className="mr-2 size-4" />
            Upravljaj postojećom pretplatom
          </Button>
        )}
      </div>
    </div>
  );
}
