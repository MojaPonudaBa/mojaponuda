import type { SupabaseClient } from "@supabase/supabase-js";

import { getMarketOverview, type MarketOverviewResult } from "@/lib/market-intelligence";
import { getTenderAreaGapReport, type TenderAreaGapReport } from "@/lib/tender-area-report";
import { getUserBidStats, type UserBidStats } from "@/lib/user-bid-analytics";
import type { Company, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

type AwardRow = {
  award_date: string | null;
  winning_price: number | null;
  total_bidders_count: number | null;
  discount_pct: number | null;
  contract_type: string | null;
  contracting_authority_jib: string | null;
  winner_jib: string | null;
  winner_name: string | null;
};

type ActiveTenderRow = {
  estimated_value: number | null;
  cpv_code: string | null;
};

export type DashboardTrzisteData = {
  overview: MarketOverviewResult;
  userStats: UserBidStats | null;
  areaReport: TenderAreaGapReport | null;
  activeTenderCount: number;
  activeTenderValue: number;
  awards12mCount: number;
  awards12mValue: number;
  avgBidders: number | null;
  avgDiscount: number | null;
  monthlyAwards: Array<{
    label: string;
    count: number;
    valueMillions: number;
  }>;
  categoryData: Array<{
    name: string;
    count: number;
    value: number;
  }>;
  procedureData: Array<{
    name: string;
    count: number;
    value: number;
  }>;
  topAuthorities: Array<{
    name: string;
    count: number;
    value: number;
    jib?: string | null;
  }>;
  topCompanies: Array<{
    name: string;
    wins: number;
    value: number;
    jib?: string | null;
  }>;
};

const MONTHS_BS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

/** Formats a numeric value as Bosnian KM currency. */
export function formatKm(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M KM`;
  }

  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(amount >= 100_000 ? 0 : 1)}k KM`;
  }

  return `${amount.toLocaleString("bs-BA")} KM`;
}

/** Formats a decimal ratio as a rounded percentage string. */
export function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}

/** Collects real market, bid, and regional data for the Trziste dashboard page. */
export async function getDashboardTrzisteData(
  supabase: Client,
  company: Pick<Company, "id" | "jib" | "industry" | "keywords" | "operating_regions" | "cpv_codes"> | null,
): Promise<DashboardTrzisteData> {
  const [overview, activeSnapshot, awardSnapshot, areaReport, userStats] = await Promise.all([
    getMarketOverview(supabase, company ?? undefined),
    getActiveTenderSnapshot(supabase),
    getAwardSnapshot(supabase),
    getTenderAreaGapReport(supabase, { pageSize: 5, maxScanRows: 500 }).catch(() => null),
    company?.id ? getUserBidStats(company.id).catch(() => null) : Promise.resolve(null),
  ]);

  const monthlyAwards = buildMonthlyAwards(awardSnapshot.awards);

  return {
    overview,
    userStats,
    areaReport,
    activeTenderCount: activeSnapshot.count,
    activeTenderValue: activeSnapshot.value,
    awards12mCount: awardSnapshot.count,
    awards12mValue: awardSnapshot.value,
    avgBidders: awardSnapshot.avgBidders,
    avgDiscount: awardSnapshot.avgDiscount,
    monthlyAwards,
    categoryData: buildCategoryData(activeSnapshot.rows),
    procedureData: buildProcedureData(awardSnapshot.awards),
    topAuthorities: buildTopAuthorities(awardSnapshot.awards),
    topCompanies: buildTopCompanies(awardSnapshot.awards),
  };
}

async function getActiveTenderSnapshot(supabase: Client) {
  const nowIso = new Date().toISOString();
  const { data, error, count } = await supabase
    .from("tenders")
    .select("estimated_value, cpv_code", { count: "exact" })
    .gt("deadline", nowIso)
    .limit(1000);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ActiveTenderRow[];

  return {
    rows,
    count: count ?? rows.length,
    value: rows.reduce((sum, tender) => sum + Number(tender.estimated_value ?? 0), 0),
  };
}

async function getAwardSnapshot(supabase: Client) {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const { data, error, count } = await supabase
    .from("award_decisions")
    .select(
      "award_date, winning_price, total_bidders_count, discount_pct, contract_type, contracting_authority_jib, winner_jib, winner_name",
      { count: "exact" },
    )
    .gte("award_date", since.toISOString())
    .order("award_date", { ascending: false })
    .limit(5000);

  if (error) {
    throw error;
  }

  const awards = (data ?? []) as AwardRow[];
  const bidderValues = awards
    .map((award) => award.total_bidders_count)
    .filter((value): value is number => typeof value === "number");
  const discountValues = awards
    .map((award) => award.discount_pct)
    .filter((value): value is number => typeof value === "number");

  return {
    awards,
    count: count ?? awards.length,
    value: awards.reduce((sum, award) => sum + Number(award.winning_price ?? 0), 0),
    avgBidders: bidderValues.length ? bidderValues.reduce((sum, value) => sum + value, 0) / bidderValues.length : null,
    avgDiscount: discountValues.length
      ? discountValues.reduce((sum, value) => sum + value, 0) / discountValues.length
      : null,
  };
}

function buildMonthlyAwards(awards: AwardRow[]) {
  const months = new Map<string, { label: string; count: number; value: number }>();
  const start = new Date();
  start.setMonth(start.getMonth() - 11);

  for (let index = 0; index < 12; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, {
      label: MONTHS_BS[date.getMonth()],
      count: 0,
      value: 0,
    });
  }

  for (const award of awards) {
    if (!award.award_date) continue;

    const date = new Date(award.award_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.get(key);

    if (bucket) {
      bucket.count += 1;
      bucket.value += Number(award.winning_price ?? 0);
    }
  }

  return Array.from(months.values()).map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    valueMillions: Number((bucket.value / 1_000_000).toFixed(2)),
  }));
}

function buildCategoryData(rows: ActiveTenderRow[]) {
  const buckets = new Map<string, { name: string; count: number; value: number }>();

  for (const tender of rows) {
    const code = tender.cpv_code?.slice(0, 2) || "Ostalo";
    const name = code === "Ostalo" ? "Ostalo" : `CPV ${code}`;
    const bucket = buckets.get(name) ?? { name, count: 0, value: 0 };

    bucket.count += 1;
    bucket.value += Number(tender.estimated_value ?? 0);
    buckets.set(name, bucket);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function buildProcedureData(awards: AwardRow[]) {
  const buckets = new Map<string, { name: string; count: number; value: number }>();

  for (const award of awards) {
    const name = award.contract_type || "Nije navedeno";
    const bucket = buckets.get(name) ?? { name, count: 0, value: 0 };

    bucket.count += 1;
    bucket.value += Number(award.winning_price ?? 0);
    buckets.set(name, bucket);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildTopAuthorities(awards: AwardRow[]) {
  const buckets = new Map<string, { name: string; count: number; value: number; jib?: string | null }>();

  for (const award of awards) {
    const key = award.contracting_authority_jib || "unknown";
    const bucket = buckets.get(key) ?? {
      name: award.contracting_authority_jib ? `Narucilac ${award.contracting_authority_jib}` : "Nepoznat narucilac",
      count: 0,
      value: 0,
      jib: award.contracting_authority_jib,
    };

    bucket.count += 1;
    bucket.value += Number(award.winning_price ?? 0);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildTopCompanies(awards: AwardRow[]) {
  const buckets = new Map<string, { name: string; wins: number; value: number; jib?: string | null }>();

  for (const award of awards) {
    const key = award.winner_jib || award.winner_name || "unknown";
    const bucket = buckets.get(key) ?? {
      name: award.winner_name || "Nepoznata firma",
      wins: 0,
      value: 0,
      jib: award.winner_jib,
    };

    bucket.wins += 1;
    bucket.value += Number(award.winning_price ?? 0);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}
