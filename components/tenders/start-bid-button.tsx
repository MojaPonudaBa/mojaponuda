"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Lock, Sparkles } from "lucide-react";
import { PaywallModal } from "@/components/subscription/paywall-modal";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";
import type { PreparationUsageSummary } from "@/lib/preparation-credits";

interface StartBidButtonProps {
  tenderId: string;
  existingBidId?: string | null;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  isSubscribed?: boolean;
  agencyClientId?: string;
  bidPathBase?: string;
}

interface PreparationPromptState {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  featureList: string[];
}

function buildPreparationPrompt(
  summary: PreparationUsageSummary,
  agencyClientId?: string | null,
): PreparationPromptState {
  const targetHref = agencyClientId
    ? `/dashboard/subscription?agencyClientId=${agencyClientId}#pripreme`
    : "/dashboard/subscription#pripreme";

  if (summary.planId === "starter") {
    return {
      title: "Nemate dostupnu pripremu",
      description: `Na Osnovnom paketu svaka priprema košta ${PRICING.preparationSingle} KM ili je možete kupiti kroz paket. Dopunite pripreme i nastavite odmah.`,
      ctaHref: targetHref,
      ctaLabel: "Kupi pripreme",
      featureList: [
        `Jedna priprema odmah za ${PRICING.preparationSingle} KM`,
        "Paketi 5, 10 ili 20 priprema za naredne tendere",
        "Jasan pregled koliko ste priprema već iskoristili",
        "Nastavak rada bez ponovnog traženja tendera",
      ],
    };
  }

  const scopeLabel =
    summary.scope === "company" ? "za ovog klijenta" : "na vašem računu";

  return {
    title: "Iskoristili ste dostupne pripreme",
    description: `U ovom ciklusu više nemate slobodnih priprema ${scopeLabel}. Dodajte paket priprema i nastavite bez prekida rada.`,
    ctaHref: targetHref,
    ctaLabel: "Dopuni pripreme",
    featureList: [
      `${summary.includedUsed} od ${summary.includedLimit} uključenih priprema već iskorišteno`,
      `${summary.purchasedRemaining} kupljenih priprema trenutno ostalo`,
      "Kupovina dodatnog paketa traje par klikova",
      "Tender i radni tok ostaju isti čim se vratite",
    ],
  };
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
  const [preparationPrompt, setPreparationPrompt] = useState<PreparationPromptState | null>(null);

  if (existingBidId) {
    return (
      <div className="space-y-2">
        <Button
          variant={variant}
          onClick={() => router.push(`${bidPathBase}/${existingBidId}`)}
          className={className || "rounded-sm font-semibold"}
        >
          <Briefcase className="mr-2 size-4" />
          Otvori postojeću ponudu
        </Button>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    );
  }

  async function handleStart() {
    if (!isSubscribed) {
      setLimitInfo(null);
      setPreparationPrompt(null);
      trackEvent("SHOW_PAYWALL_FREE_USER_ACTION", { tenderId });
      setShowPaywall(true);
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingText("Kreiram radni prostor za ponudu...");

    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tender_id: tenderId,
          auto_generate_checklist: false,
          agency_client_id: agencyClientId ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "LIMIT_REACHED") {
          setLimitInfo({ limit: data.limit, current: data.current });
          setPreparationPrompt(null);
          trackEvent("SHOW_PAYWALL_LIMIT_REACHED", {
            tenderId,
            limit: data.limit,
            current: data.current,
          });
          setShowPaywall(true);
          setLoading(false);
          return;
        }

        if (data.code === "SUBSCRIPTION_REQUIRED") {
          setLimitInfo(null);
          setPreparationPrompt(null);
          setShowPaywall(true);
          setLoading(false);
          return;
        }

        if (data.code === "PREPARATION_CREDITS_REQUIRED" && data.summary) {
          const prompt = buildPreparationPrompt(
            data.summary as PreparationUsageSummary,
            (data.agencyClientId as string | null | undefined) ?? agencyClientId ?? null,
          );
          setPreparationPrompt(prompt);
          setLimitInfo(null);
          setShowPaywall(true);
          setLoading(false);
          return;
        }

        throw new Error(data.error || "Greška pri kreiranju ponude.");
      }

      if (data.bid?.id) {
        router.push(`${bidPathBase}/${data.bid.id}`);
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
              Započni pripremu ponude
            </>
          )}
        </Button>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title={
          preparationPrompt?.title ??
          (limitInfo ? "Dostigli ste limit paketa" : "Profesionalna priprema ponude je dostupna uz pretplatu")
        }
        description={
          preparationPrompt?.description ??
          (limitInfo
            ? `Vaš trenutni paket omogućava maksimalno ${limitInfo.limit} aktivnih tendera. Trenutno imate ${limitInfo.current}. Nadogradite paket ako želite nastaviti rad bez blokade.`
            : "Uz pretplatu dobijate profesionalnu pripremu ponude, početnu listu onoga što treba prikupiti i jasniji pregled prije slanja.")
        }
        limitType="tenders"
        isPerTenderUnlock={Boolean(preparationPrompt)}
        ctaHref={preparationPrompt?.ctaHref}
        ctaLabel={preparationPrompt?.ctaLabel}
        featureList={preparationPrompt?.featureList}
      />
    </>
  );
}
