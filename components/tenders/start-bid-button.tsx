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

  if (existingBidId) {
    return (
      <Button
        variant={variant}
        onClick={() => router.push(`/dashboard/bids/${existingBidId}`)}
        className={className || "rounded-sm font-semibold"}
      >
        <Briefcase className="mr-2 size-4" />
        Otvori postojeću ponudu
      </Button>
    );
  }

  async function handleStart() {
    setLoading(true);
    setLoadingText("Kreiranje ponude...");
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tender_id: tenderId }),
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
        // If subscribed, auto-analyze to generate checklist and attach vault documents
        if (isSubscribed) {
          setLoadingText("AI Analiza tendera i kreiranje checkliste...");
          try {
            await fetch("/api/bids/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bid_id: data.bid.id }),
            });
          } catch (analyzeErr) {
            console.error("Auto-analyze error:", analyzeErr);
            // Ignore error, still proceed to bid workspace
          }
        }
        router.push(`/dashboard/bids/${data.bid.id}`);
      }
    } catch (err) {
      console.error("Start bid error:", err);
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={handleStart} disabled={loading} variant={variant} className={className || "rounded-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"}>
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" />
            Započni pripremu (AI Checklista)
          </>
        )}
      </Button>

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

