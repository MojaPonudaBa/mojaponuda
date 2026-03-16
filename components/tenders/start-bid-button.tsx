"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase, Sparkles } from "lucide-react";
import { PaywallModal } from "@/components/subscription/paywall-modal";

interface StartBidButtonProps {
  tenderId: string;
  existingBidId?: string | null;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  isSubscribed?: boolean;
}

export function StartBidButton({ tenderId, existingBidId, variant = "default", className, isSubscribed = false }: StartBidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; current: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (existingBidId) {
    return (
      <div className="space-y-2">
        <Button
          variant={variant}
          onClick={() => router.push(`/dashboard/bids/${existingBidId}`)}
          className={className || "rounded-sm font-semibold"}
        >
          <Briefcase className="mr-2 size-4" />
          Otvori postojeću ponudu
        </Button>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  async function handleStart() {
    setError(null);
    setLoading(true);
    setLoadingText(isSubscribed ? "Pripremam radni prostor i checklistu..." : "Pripremam radni prostor i početnu checklistu...");
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tender_id: tenderId,
          auto_generate_checklist: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setLimitInfo({ limit: data.limit, current: data.current });
          setShowPaywall(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Greška pri kreiranju ponude.");
      }

      if (data.bid?.id) {
        router.push(`/dashboard/bids/${data.bid.id}`);
      }
    } catch (err) {
      console.error("Start bid error:", err);
      const message = err instanceof Error ? err.message : "Greška pri kreiranju ponude.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Button onClick={handleStart} disabled={loading} variant={variant} className={className || "rounded-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {loadingText}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Započni pripremu
            </>
          )}
        </Button>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title="Dostigli ste limit paketa"
        description={`Vaš trenutni paket omogućava maksimalno ${limitInfo?.limit} aktivnih tendera. Trenutno imate ${limitInfo?.current}. Nadogradite paket za više prostora.`}
        limitType="tenders"
      />
    </>
  );
}

