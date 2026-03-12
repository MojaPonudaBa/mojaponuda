"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Lock } from "lucide-react";

interface PaywallOverlayProps {
  usedBids: number;
  maxFreeBids: number;
}

export function PaywallOverlay({ usedBids, maxFreeBids }: PaywallOverlayProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* Blur overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 backdrop-blur-sm" />

      {/* CTA kartica */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-xl">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-6 text-primary" />
          </div>

          <h3 className="mt-4 text-lg font-bold tracking-tight">
            Pretplatite se za pripremu ponuda
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Iskoristili ste {usedBids} od {maxFreeBids} besplatnih ponuda.
            Pretplatite se za neograničen pristup.
          </p>

          <div className="mt-3 flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold">80 EUR</span>
            <span className="text-sm text-muted-foreground">/ mjesečno</span>
          </div>

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

          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Otkazivanje u bilo kojem trenutku
          </p>
        </div>
      </div>
    </div>
  );
}
