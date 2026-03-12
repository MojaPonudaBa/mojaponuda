"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivna",
  past_due: "Dospjela uplata",
  cancelled: "Otkazana",
  paused: "Pauzirana",
  unpaid: "Neplaćena",
  inactive: "Neaktivna",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400",
  past_due: "text-amber-400",
  cancelled: "text-red-400",
  paused: "text-muted-foreground",
  unpaid: "text-red-400",
  inactive: "text-muted-foreground",
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
      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="size-5 text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              MojaPonuda Pro
            </h2>
            <p className={`text-sm font-medium ${STATUS_COLORS[status] ?? "text-muted-foreground"}`}>
              {STATUS_LABELS[status] ?? status}
            </p>
          </div>
        </div>

        {currentPeriodEnd && (
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Sljedeća obnova:{" "}
            <span className="text-foreground">
              {new Date(currentPeriodEnd).toLocaleDateString("bs-BA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}

        <Button
          className="mt-4"
          variant="outline"
          onClick={handlePortal}
          disabled={loading || !hasCustomerId}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          Upravljaj pretplatom
        </Button>
      </div>
    );
  }

  // Neaktivna pretplata — prikaz ponude
  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <XCircle className="size-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            MojaPonuda Pro
          </h2>
          <p className={`text-sm font-medium ${STATUS_COLORS[status] ?? "text-muted-foreground"}`}>
            {STATUS_LABELS[status] ?? status}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">80 EUR</span>
          <span className="text-sm text-muted-foreground">/ mjesečno</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle className="size-3.5 text-emerald-400" />
            Neograničen broj ponuda
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="size-3.5 text-emerald-400" />
            AI analiza tendera
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="size-3.5 text-emerald-400" />
            Izvoz PDF paketa
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="size-3.5 text-emerald-400" />
            Tržišna analitika
          </li>
        </ul>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      <Button
        className="mt-4 w-full"
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CreditCard className="size-4" />
        )}
        Pretplatite se
      </Button>

      {hasCustomerId && (
        <Button
          className="mt-2 w-full"
          variant="outline"
          onClick={handlePortal}
          disabled={loading}
        >
          <ExternalLink className="size-4" />
          Upravljaj pretplatom
        </Button>
      )}
    </div>
  );
}
