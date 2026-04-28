/**
 * Win probability — procjena šanse za pobjedu na osnovu:
 *   - prosječnog broja ponuđača (baseline 1/N)
 *   - win rate-a korisnikove firme kod tog naručioca
 *   - win rate-a korisnikove firme u toj CPV kategoriji
 * Klampovano u [5%, 95%].
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface WinProbability {
  probability: number; // 0-100
  confidence: "high" | "medium" | "low";
  factors: string[];
  based_on_bidders: number | null;
  company_history_count: number;
}

const MIN_HISTORY_FOR_ADJUSTMENT = 3;

function normalizeCpvPrefix(cpvCode: string | null | undefined): string | null {
  if (!cpvCode) return null;
  const clean = cpvCode.replace(/[^0-9]/g, "");
  if (clean.length < 3) return null;
  return clean.slice(0, 3);
}

export async function getWinProbability(params: {
  companyJib: string | null | undefined;
  cpvCode: string | null | undefined;
  authorityJib: string | null | undefined;
}): Promise<WinProbability | null> {
  const { companyJib, cpvCode, authorityJib } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createAdminClient();
  const cpvPrefix = normalizeCpvPrefix(cpvCode);
  const factors: string[] = [];

  // 1) Baseline: prosjek broja ponuđača za taj kontekst
  let avgBidders: number | null = null;
  let biddersSource = "";

  if (authorityJib && cpvPrefix) {
    const { data } = await supabase
      .from("authority_cpv_stats")
      .select("tender_count, avg_bidders_count")
      .eq("authority_jib", authorityJib)
      .like("cpv_code", `${cpvPrefix}%`)
      .order("tender_count", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.avg_bidders_count && data.tender_count >= 3) {
      avgBidders = Number(data.avg_bidders_count);
      biddersSource = `kod ovog naručioca u ovoj kategoriji (${data.tender_count} tendera)`;
    }
  }

  if (!avgBidders && authorityJib) {
    const { data } = await supabase
      .from("authority_stats")
      .select("tender_count, avg_bidders_count")
      .eq("authority_jib", authorityJib)
      .maybeSingle();
    if (data?.avg_bidders_count && data.tender_count >= 5) {
      avgBidders = Number(data.avg_bidders_count);
      biddersSource = `kod ovog naručioca općenito (${data.tender_count} tendera)`;
    }
  }

  if (!avgBidders && cpvPrefix) {
    const { data } = await supabase
      .from("cpv_stats")
      .select("tender_count, avg_bidders_count")
      .like("cpv_code", `${cpvPrefix}%`)
      .order("tender_count", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.avg_bidders_count && data.tender_count >= 10) {
      avgBidders = Number(data.avg_bidders_count);
      biddersSource = `u ovoj CPV kategoriji (${data.tender_count} tendera)`;
    }
  }

  if (!avgBidders) return null;

  let probability = 100 / Math.max(1, avgBidders);
  factors.push(
    `Prosječan broj ponuđača ${avgBidders.toFixed(1)} ${biddersSource} → baseline šansa ${probability.toFixed(1)}%.`
  );

  let historyCount = 0;

  // 2) Prilagoditi prema historije firme × naručilac
  if (companyJib && authorityJib) {
    const { data } = await supabase
      .from("company_authority_stats")
      .select("appearances, wins, win_rate")
      .eq("company_jib", companyJib)
      .eq("authority_jib", authorityJib)
      .maybeSingle();
    if (data && data.appearances >= MIN_HISTORY_FOR_ADJUSTMENT && data.win_rate !== null) {
      const adjFactor = (Number(data.win_rate) * avgBidders) / 100; // relative to baseline
      probability *= Math.max(0.3, Math.min(3, adjFactor || 1));
      historyCount += data.appearances;
      factors.push(
        `Vaša firma ima ${data.win_rate}% stopu uspjeha kod ovog naručioca na osnovu ${data.appearances} ranijih nastupa.`
      );
    }
  }

  // 3) Prilagoditi prema historije firme × CPV
  if (companyJib && cpvPrefix) {
    const { data } = await supabase
      .from("company_cpv_stats")
      .select("appearances, wins, win_rate")
      .eq("company_jib", companyJib)
      .like("cpv_code", `${cpvPrefix}%`)
      .order("appearances", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && data.appearances >= MIN_HISTORY_FOR_ADJUSTMENT && data.win_rate !== null) {
      const adjFactor = (Number(data.win_rate) * avgBidders) / 100;
      probability *= Math.max(0.4, Math.min(2.5, adjFactor || 1));
      historyCount += data.appearances;
      factors.push(
        `Vaša stopa uspjeha u ovoj kategoriji je ${data.win_rate}% (${data.appearances} nastupa).`
      );
    }
  }

  // Clamp
  probability = Math.max(5, Math.min(95, probability));

  const confidence: WinProbability["confidence"] =
    historyCount >= 10 ? "high" : historyCount >= 3 ? "medium" : "low";

  return {
    probability: Math.round(probability),
    confidence,
    factors,
    based_on_bidders: Math.round(avgBidders * 10) / 10,
    company_history_count: historyCount,
  };
}
