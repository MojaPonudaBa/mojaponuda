"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase, Lock, Sparkles } from "lucide-react";
import { PaywallModal } from "@/components/subscription/paywall-modal";
import { PRICING } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";

interface StartBidButtonProps {
  tenderId: string;
  existingBidId?: string | null;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  isSubscribed?: boolean;
  agencyClientId?: string;
  bidPathBase?: string;
}

export function StartBidButton({
  tenderId,
  existingBidId,
  variant = "default",
  className,
  isSubscribed = false,
  agencyClientId,
  bidPathBase = "/dashboard/bids",
}: StartBidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; current: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTenderPaywall, setShowTenderPaywall] = useState(false);
  const [paywallTenderId, setPaywallTenderId] = useState<string | null>(null);

  if (existingBidId) {
    return (
      <div className="space-y-2">
        <Button
          variant={variant}
          onClick={() => router.push(`${bidPathBase}/${existingBidId}`)}
          className={className || "rounded-sm font-semibold"}
        >
          <Briefcase className="mr-2 size-4" />
          Otvori postojecu ponudu
        </Button>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    );
  }

  async function handleStart() {
    if (!isSubscribed) {
      setLimitInfo(null);
      trackEvent("SHOW_PAYWALL_FREE_USER_ACTION", { tenderId });
      setShowPaywall(true);
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingText("Kreiram radni prostor za ponudu...");

    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tender_id: tenderId,
          auto_generate_checklist: false,
          agency_client_id: agencyClientId ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setLimitInfo({ limit: data.limit, current: data.current });
          trackEvent("SHOW_PAYWALL_LIMIT_REACHED", { tenderId, limit: data.limit, current: data.current });
          setShowPaywall(true);
          setLoading(false);
          return;
        }

        if (data.code === "SUBSCRIPTION_REQUIRED") {
          setLimitInfo(null);
          setShowPaywall(true);
          setLoading(false);
          return;
        }

        if (data.code === "PAYWALL_REQUIRED") {
          setPaywallTenderId(data.tenderId);
          trackEvent("SHOW_PAYWALL_PER_TENDER", { tenderId: data.tenderId || tenderId });
          setShowTenderPaywall(true);
          setLoading(false);
          return;
        }

        throw new Error(data.error || "Greska pri kreiranju ponude.");
      }

      if (data.bid?.id) {
        router.push(`${bidPathBase}/${data.bid.id}`);
      }
    } catch (err) {
      console.error("Start bid error:", err);
      const message = err instanceof Error ? err.message : "Greska pri kreiranju ponude.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          onClick={handleStart}
          disabled={loading}
          variant={variant}
          className={className || "rounded-sm bg-blue-600 font-semibold text-white hover:bg-blue-700"}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {loadingText}
            </>
          ) : (
            <>
              {isSubscribed ? <Sparkles className="mr-2 size-4" /> : <Lock className="mr-2 size-4" />}
              Zapocni pripremu ponude
            </>
          )}
        </Button>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title={limitInfo ? "Dostigli ste limit paketa" : "Profesionalna priprema ponude je dostupna uz pretplatu"}
        description={
          limitInfo
            ? `Vas trenutni paket omogucava maksimalno ${limitInfo.limit} aktivnih tendera. Trenutno imate ${limitInfo.current}. Nadogradite paket ako zelite nastaviti rad bez blokade.`
            : "Uz pretplatu dobijate profesionalnu pripremu ponude, pocetnu listu onoga sto treba prikupiti i jasniji pregled prije slanja."
        }
        limitType="tenders"
      />

      <PaywallModal
        isOpen={showTenderPaywall}
        onClose={() => setShowTenderPaywall(false)}
        title={`Otkljucaj ovaj tender (${PRICING.tenderUnlock} KM)`}
        description={`Vas Osnovni paket vam omogucava pregled tendera, ali priprema ponude se naplacuje po tenderu. Otkljucajte ovaj tender za samo ${PRICING.tenderUnlock} KM.`}
        limitType="tenders"
        isPerTenderUnlock={true}
        tenderId={paywallTenderId || tenderId}
      />
    </>
  );
}
