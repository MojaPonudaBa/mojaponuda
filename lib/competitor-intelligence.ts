/**
 * Competitor intelligence — top firme koje se natječu na sličnim tenderima
 * (isti naručilac + ista CPV kategorija). Koristi `award_decisions` +
 * pre-kalkulirane `company_stats` za win rate.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface CompetitorSummary {
  jib: string;
  name: string;
  win_rate: number | null;
  appearances: number;
  wins: number;
  avg_winning_price: number | null;
  recent_wins: Array<{
    tender_title: string | null;
    winning_price: number | null;
    award_date: string | null;
  }>;
}

export interface SimilarTender {
  id: string;
  title: string;
  winning_price: number | null;
  estimated_value: number | null;
  discount_pct: number | null;
  winner_name: string | null;
  award_date: string | null;
}

function normalizeCpvPrefix(cpvCode: string | null | undefined): string | null {
  if (!cpvCode) return null;
  const clean = cpvCode.replace(/[^0-9]/g, "");
  if (clean.length < 3) return null;
  return clean.slice(0, 3);
}

export async function getCompetitors(params: {
  cpvCode: string | null | undefined;
  authorityJib: string | null | undefined;
  excludeJib?: string;
  limit?: number;
}): Promise<CompetitorSummary[]> {
  const limit = params.limit ?? 5;
  const cpvPrefix = normalizeCpvPrefix(params.cpvCode);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createAdminClient();

  let q = supabase
    .from("award_decisions")
    .select("winner_name, winner_jib, winning_price, award_date, tender_id, tenders(title, cpv_code)")
    .not("winner_jib", "is", null)
    .limit(300);

  if (params.authorityJib) q = q.eq("contracting_authority_jib", params.authorityJib);
  // CPV filter primjenjujemo post-hoc na join-ovanoj koloni (PostgREST ograničenje)

  const { data } = await q.order("award_date", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? [];

  const grouped = new Map<
    string,
    {
      jib: string;
      name: string;
      appearances: number;
      wins: number;
      totalWinningPrice: number;
      recentWins: CompetitorSummary["recent_wins"];
    }
  >();

  for (const r of rows) {
    const t = Array.isArray(r.tenders) ? r.tenders[0] : r.tenders;
    if (cpvPrefix) {
      const cc = (t?.cpv_code ?? "").replace(/[^0-9]/g, "");
      if (!cc.startsWith(cpvPrefix)) continue;
    }
    const jib = r.winner_jib;
    if (params.excludeJib && jib === params.excludeJib) continue;
    const existing = grouped.get(jib) ?? {
      jib,
      name: r.winner_name ?? jib,
      appearances: 0,
      wins: 0,
      totalWinningPrice: 0,
      recentWins: [] as CompetitorSummary["recent_wins"],
    };
    existing.appearances += 1;
    existing.wins += 1;
    if (r.winning_price) existing.totalWinningPrice += Number(r.winning_price);
    if (existing.recentWins.length < 3) {
      existing.recentWins.push({
        tender_title: t?.title ?? null,
        winning_price: r.winning_price ? Number(r.winning_price) : null,
        award_date: r.award_date ?? null,
      });
    }
    grouped.set(jib, existing);
  }

  const competitors = [...grouped.values()]
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, limit);

  // Obogati win rateom iz company_stats
  const jibs = competitors.map((c) => c.jib);
  const { data: statsRows } =
    jibs.length > 0
      ? await supabase.from("company_stats").select("company_jib, win_rate").in("company_jib", jibs)
      : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winRateByJib = new Map<string, number>((statsRows ?? []).map((s: any) => [s.company_jib, Number(s.win_rate)]));

  return competitors.map((c) => ({
    jib: c.jib,
    name: c.name,
    win_rate: winRateByJib.get(c.jib) ?? null,
    appearances: c.appearances,
    wins: c.wins,
    avg_winning_price: c.wins > 0 ? Math.round(c.totalWinningPrice / c.wins) : null,
    recent_wins: c.recentWins,
  }));
}

export async function getSimilarTenders(params: {
  cpvCode: string | null | undefined;
  authorityJib: string | null | undefined;
  limit?: number;
}): Promise<SimilarTender[]> {
  const limit = params.limit ?? 5;
  const cpvPrefix = normalizeCpvPrefix(params.cpvCode);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createAdminClient();

  let q = supabase
    .from("award_decisions")
    .select(
      "tender_id, winner_name, winning_price, estimated_value, discount_pct, award_date, tenders(id, title, cpv_code)"
    )
    .limit(200);

  if (params.authorityJib) q = q.eq("contracting_authority_jib", params.authorityJib);
  const { data } = await q.order("award_date", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? [];

  const filtered: SimilarTender[] = [];
  for (const r of rows) {
    const t = Array.isArray(r.tenders) ? r.tenders[0] : r.tenders;
    if (cpvPrefix) {
      const cc = (t?.cpv_code ?? "").replace(/[^0-9]/g, "");
      if (!cc.startsWith(cpvPrefix)) continue;
    }
    filtered.push({
      id: t?.id ?? r.tender_id,
      title: t?.title ?? "",
      winning_price: r.winning_price ? Number(r.winning_price) : null,
      estimated_value: r.estimated_value ? Number(r.estimated_value) : null,
      discount_pct: r.discount_pct ? Number(r.discount_pct) : null,
      winner_name: r.winner_name ?? null,
      award_date: r.award_date ?? null,
    });
    if (filtered.length >= limit) break;
  }
  return filtered;
}
