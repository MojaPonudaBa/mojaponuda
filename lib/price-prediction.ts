/**
 * Price prediction za javne nabavke — koristi agregatne `authority_cpv_stats`,
 * `authority_stats` i `cpv_stats` tablice s prioritetom specifičnosti.
 *
 * Popunjeno: scripts/backfill-analytics.ts (jednokratno) i dnevni cron.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface PricePrediction {
  suggested_min: number;
  suggested_max: number;
  suggested_optimal: number;
  avg_discount_pct: number;
  confidence: "high" | "medium" | "low";
  based_on_count: number;
  based_on: "authority+cpv" | "authority" | "cpv";
  explanation: string;
}

const MIN_AUTHORITY_CPV_SAMPLES = 5;
const MIN_AUTHORITY_SAMPLES = 5;
const MIN_CPV_SAMPLES = 10;

function normalizeCpvPrefix(cpvCode: string | null | undefined): string | null {
  if (!cpvCode) return null;
  const clean = cpvCode.replace(/[^0-9]/g, "");
  if (clean.length < 3) return null;
  // Koristimo 3-cifreni prefix za grupu djelatnosti (npr. 450 za Gradjevinski radovi).
  return clean.slice(0, 3);
}

export async function getPricePrediction(params: {
  estimatedValue: number | null;
  cpvCode: string | null | undefined;
  authorityJib: string | null | undefined;
}): Promise<PricePrediction | null> {
  const { estimatedValue, cpvCode, authorityJib } = params;
  if (!estimatedValue || estimatedValue <= 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createAdminClient();
  const cpvPrefix = normalizeCpvPrefix(cpvCode);

  // 1) Najspecifičnija: authority × CPV (exact + prefix fallback)
  if (authorityJib && cpvPrefix) {
    const { data: ac } = await supabase
      .from("authority_cpv_stats")
      .select("tender_count, avg_discount_pct")
      .eq("authority_jib", authorityJib)
      .like("cpv_code", `${cpvPrefix}%`)
      .order("tender_count", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ac && ac.tender_count >= MIN_AUTHORITY_CPV_SAMPLES && ac.avg_discount_pct !== null) {
      return buildPrediction({
        estimatedValue,
        discountPct: Number(ac.avg_discount_pct),
        count: ac.tender_count,
        basedOn: "authority+cpv",
        confidence: ac.tender_count >= 15 ? "high" : "medium",
        explanation: `Prosječni pobjednički popust kod ovog naručioca za istu kategoriju na osnovu ${ac.tender_count} tendera.`,
      });
    }
  }

  // 2) Srednja: authority generalno
  if (authorityJib) {
    const { data: a } = await supabase
      .from("authority_stats")
      .select("tender_count, avg_discount_pct")
      .eq("authority_jib", authorityJib)
      .maybeSingle();

    if (a && a.tender_count >= MIN_AUTHORITY_SAMPLES && a.avg_discount_pct !== null) {
      return buildPrediction({
        estimatedValue,
        discountPct: Number(a.avg_discount_pct),
        count: a.tender_count,
        basedOn: "authority",
        confidence: a.tender_count >= 20 ? "medium" : "low",
        explanation: `Prosječni pobjednički popust kod ovog naručioca općenito na osnovu ${a.tender_count} tendera.`,
      });
    }
  }

  // 3) Najširi: samo CPV kategorija
  if (cpvPrefix) {
    const { data: c } = await supabase
      .from("cpv_stats")
      .select("tender_count, avg_discount_pct")
      .like("cpv_code", `${cpvPrefix}%`)
      .order("tender_count", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (c && c.tender_count >= MIN_CPV_SAMPLES && c.avg_discount_pct !== null) {
      return buildPrediction({
        estimatedValue,
        discountPct: Number(c.avg_discount_pct),
        count: c.tender_count,
        basedOn: "cpv",
        confidence: c.tender_count >= 40 ? "medium" : "low",
        explanation: `Prosječni pobjednički popust u kategoriji CPV ${cpvPrefix}* na osnovu ${c.tender_count} tendera.`,
      });
    }
  }

  return null;
}

function buildPrediction(input: {
  estimatedValue: number;
  discountPct: number;
  count: number;
  basedOn: PricePrediction["based_on"];
  confidence: PricePrediction["confidence"];
  explanation: string;
}): PricePrediction {
  const { estimatedValue, discountPct, count, basedOn, confidence, explanation } = input;
  const optimal = estimatedValue * (1 - discountPct / 100);
  // Raspon: ± 3 procentna poena oko prosječnog popusta.
  const maxPrice = estimatedValue * (1 - Math.max(0, discountPct - 3) / 100);
  const minPrice = estimatedValue * (1 - Math.min(30, discountPct + 3) / 100);
  return {
    suggested_min: Math.round(minPrice),
    suggested_max: Math.round(maxPrice),
    suggested_optimal: Math.round(optimal),
    avg_discount_pct: Math.round(discountPct * 10) / 10,
    confidence,
    based_on_count: count,
    based_on: basedOn,
    explanation,
  };
}
