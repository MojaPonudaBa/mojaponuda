import { formatCurrencyKM } from "@/lib/currency";
import type { MarketOverviewResult } from "@/lib/market-intelligence";

export interface MarketSummaryResult {
  title: string;
  sentences: string[];
  source: "ai" | "fallback";
}

function buildFallbackSummary(overview: MarketOverviewResult): MarketSummaryResult {
  const topCategory = overview.categoryData[0]?.category ?? "više kategorija";
  const sentences = [
    `Otvoreno je ${overview.activeTenderCount} tendera u vašem prostoru.`,
    ...(overview.activeTenderValueKnownCount > 0
      ? [`Objavljena procijenjena vrijednost otvorenih tendera iznosi ${formatCurrencyKM(overview.activeTenderValue)}.`]
      : []),
    ...(overview.yearAwardValue > 0
      ? [`U ${new Date().getFullYear()}. godini dodijeljeno je ${formatCurrencyKM(overview.yearAwardValue)}. Najviše aktivnosti je u kategoriji ${topCategory}.`]
      : []),
    ...(overview.plannedCount90d > 0
      ? [
          overview.plannedValueKnownCount > 0
            ? `${overview.plannedCount90d} nadolazećih tendera nosi najmanje ${formatCurrencyKM(overview.plannedValue90d)} poznate vrijednosti.`
            : `${overview.plannedCount90d} nadolazećih tendera je trenutno bez objavljene procijenjene vrijednosti.`,
        ]
      : []),
    ...(overview.avgBiddersSampleCount > 0
      ? [`U zadnjih 90 dana prosjek je ${overview.avgBidders90d ?? "—"} ponuđača po postupku.`]
      : []),
    ...(overview.avgDiscountSampleCount > 0
      ? [`Prosječan popust u zadnjih 90 dana je ${overview.avgDiscount90d !== null ? `${overview.avgDiscount90d}%` : "—"}.`]
      : []),
  ].slice(0, 4);

  return {
    title: "Sažetak tržišta",
    source: "fallback",
    sentences: sentences.length > 0 ? sentences : ["Za vaš trenutni profil još nema dovoljno tržišnih podataka za jači sažetak."],
  };
}

export async function generateMarketSummary(
  overview: MarketOverviewResult
): Promise<MarketSummaryResult> {
  return buildFallbackSummary(overview);
}
