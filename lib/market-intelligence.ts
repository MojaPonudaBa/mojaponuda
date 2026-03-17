import type { SupabaseClient } from "@supabase/supabase-js";
import type { Company, Database } from "@/types/database";
import {
  buildProfileKeywordSeeds,
  parseCompanyProfile,
  sanitizeSearchKeywords,
} from "@/lib/company-profile";
import { buildRegionSearchTerms } from "@/lib/constants/regions";

interface CompetitorAccumulator {
  name: string;
  jib: string;
  wins: number;
  totalValue: number;
  categories: Set<string>;
  procedures: Set<string>;
  authorityJibs: Set<string>;
  authorityCounts: Map<string, number>;
  lastWinDate: string | null;
  recentWins90d: number;
  recentValue90d: number;
  biddersSum: number;
  biddersCount: number;
  discountSum: number;
  discountCount: number;
  categoryMatchWins: number;
  authorityMatchWins: number;
}

export interface CompetitorInsight {
  name: string;
  jib: string;
  wins: number;
  total_value: number;
  categories: string[];
  procedure_types: string[];
  last_win_date: string | null;
  win_rate: number | null;
  total_bids: number | null;
  total_market_wins: number | null;
  total_market_value: number | null;
  city: string | null;
  municipality: string | null;
  recent_wins_90d: number;
  recent_value_90d: number;
  avg_award_value: number | null;
  avg_discount: number | null;
  avg_bidders: number | null;
  authority_count: number;
  top_authorities: string[];
  category_match_wins: number;
  authority_match_wins: number;
  signal_score: number;
}

export interface AuthorityMarketInsight {
  jib: string | null;
  name: string;
  city: string | null;
  authority_type: string | null;
  awards: number;
  total_value: number;
  unique_winners: number;
}

export interface CompetitorAnalysisResult {
  competitors: CompetitorInsight[];
  authorities: AuthorityMarketInsight[];
  sourceTerms: string[];
  matchedCategories: string[];
  matchedAuthorityCount: number;
  trackedAwardsCount: number;
  totalCompetitorValue: number;
  totalCompetitorWins: number;
}

export interface MarketCategoryInsight {
  category: string;
  count: number;
  total_value: number;
}

export interface MarketProcedureInsight {
  procedure_type: string;
  count: number;
  total_value: number;
  avg_bidders: number | null;
  avg_discount: number | null;
}

export interface MarketMonthlyInsight {
  month_key: string;
  label: string;
  count: number;
  total_value: number;
}

export interface MarketAuthorityInsight {
  name: string;
  jib: string | null;
  count: number;
  total_value: number;
  city: string | null;
  authority_type: string | null;
}

export interface MarketWinnerInsight {
  name: string;
  jib: string;
  wins: number;
  total_value: number;
  win_rate: number | null;
  total_bids: number | null;
  city: string | null;
  municipality: string | null;
}

export interface MarketUpcomingInsight {
  id: string;
  description: string | null;
  planned_date: string | null;
  estimated_value: number | null;
  contract_type: string | null;
  contracting_authorities: { name: string; jib: string } | null;
}

export interface MarketOverviewResult {
  activeTenderCount: number;
  activeTenderValue: number;
  yearAwardValue: number;
  plannedCount90d: number;
  plannedValue90d: number;
  avgDiscount90d: number | null;
  avgBidders90d: number | null;
  avgAwardValue90d: number | null;
  categoryData: MarketCategoryInsight[];
  procedureData: MarketProcedureInsight[];
  monthlyAwards: MarketMonthlyInsight[];
  topAuthorities: MarketAuthorityInsight[];
  topWinners: MarketWinnerInsight[];
  upcomingPlans: MarketUpcomingInsight[];
}

type AwardRow = Pick<
  Database["public"]["Tables"]["award_decisions"]["Row"],
  | "portal_award_id"
  | "winner_name"
  | "winner_jib"
  | "winning_price"
  | "contract_type"
  | "award_date"
  | "total_bidders_count"
  | "discount_pct"
  | "procedure_type"
  | "contracting_authority_jib"
>;

type AuthorityRow = Pick<
  Database["public"]["Tables"]["contracting_authorities"]["Row"],
  "jib" | "name" | "city" | "authority_type"
>;

type MarketCompanyRow = Pick<
  Database["public"]["Tables"]["market_companies"]["Row"],
  | "jib"
  | "win_rate"
  | "total_bids_count"
  | "total_wins_count"
  | "total_won_value"
  | "city"
  | "municipality"
>;

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function scoreRegionMatch(source: string | null | undefined, regions: string[]): number {
  if (!source || regions.length === 0) {
    return 0;
  }

  const normalizedSource = source.toLowerCase();
  return regions.some((region) => normalizedSource.includes(region.toLowerCase())) ? 1 : 0;
}

function buildSearchTerms(company: Pick<Company, "keywords" | "industry">): string[] {
  const profile = parseCompanyProfile(company.industry);

  return sanitizeSearchKeywords([
    ...(company.keywords ?? []),
    ...buildProfileKeywordSeeds(profile),
  ]).slice(0, 16);
}

function buildKeywordOrConditions(terms: string[]): string {
  return terms
    .map((term) => term.replace(/,/g, " ").trim())
    .filter(Boolean)
    .map((term) => `title.ilike.%${term}%,raw_description.ilike.%${term}%`)
    .join(",");
}

export async function getCompetitorAnalysis(
  supabase: SupabaseClient<Database>,
  company: Pick<Company, "jib" | "keywords" | "operating_regions" | "industry">
): Promise<CompetitorAnalysisResult> {
  const searchTerms = buildSearchTerms(company);
  const operatingRegions = buildRegionSearchTerms(company.operating_regions ?? []);
  const nowIso = new Date().toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: ourAwards } = company.jib
    ? await supabase
        .from("award_decisions")
        .select("contract_type, contracting_authority_jib")
        .eq("winner_jib", company.jib)
        .limit(500)
    : { data: [] };

  const matchedCategories = uniqueStrings((ourAwards ?? []).map((award) => award.contract_type));
  const historicalAuthorityJibs = uniqueStrings(
    (ourAwards ?? []).map((award) => award.contracting_authority_jib)
  );

  let profileAuthorityRows: {
    contracting_authority_jib: string | null;
    contracting_authority: string | null;
    title: string;
    raw_description: string | null;
  }[] = [];

  if (searchTerms.length > 0) {
    const keywordConditions = buildKeywordOrConditions(searchTerms);

    if (keywordConditions) {
      const { data: tenderRows } = await supabase
        .from("tenders")
        .select("contracting_authority_jib, contracting_authority, title, raw_description")
        .gt("deadline", nowIso)
        .or(keywordConditions)
        .limit(600);

      profileAuthorityRows = ((tenderRows ?? []) as typeof profileAuthorityRows)
        .sort((a, b) => {
          const scoreA =
            scoreRegionMatch(a.contracting_authority, operatingRegions) +
            scoreRegionMatch(a.title, operatingRegions) +
            scoreRegionMatch(a.raw_description, operatingRegions);
          const scoreB =
            scoreRegionMatch(b.contracting_authority, operatingRegions) +
            scoreRegionMatch(b.title, operatingRegions) +
            scoreRegionMatch(b.raw_description, operatingRegions);

          return scoreB - scoreA;
        })
        .slice(0, 250);
    }
  }

  const authorityNameFallbackMap = new Map<string, string>();
  for (const row of profileAuthorityRows) {
    if (row.contracting_authority_jib && row.contracting_authority) {
      authorityNameFallbackMap.set(row.contracting_authority_jib, row.contracting_authority);
    }
  }

  const relevantAuthorityJibs = uniqueStrings([
    ...historicalAuthorityJibs,
    ...profileAuthorityRows.map((row) => row.contracting_authority_jib),
  ]);

  const { data: authorityRows } = relevantAuthorityJibs.length > 0
    ? await supabase
        .from("contracting_authorities")
        .select("jib, name, city, authority_type")
        .in("jib", relevantAuthorityJibs)
    : { data: [] };

  const authorityMap = new Map<string, AuthorityRow>(
    ((authorityRows ?? []) as AuthorityRow[]).map((authority) => [authority.jib, authority])
  );

  const { data: categoryAwards } = matchedCategories.length > 0
    ? await supabase
        .from("award_decisions")
        .select(
          "portal_award_id, winner_name, winner_jib, winning_price, contract_type, award_date, total_bidders_count, discount_pct, procedure_type, contracting_authority_jib"
        )
        .in("contract_type", matchedCategories)
        .not("winner_jib", "is", null)
        .order("award_date", { ascending: false })
        .limit(2000)
    : { data: [] };

  const { data: authorityAwards } = relevantAuthorityJibs.length > 0
    ? await supabase
        .from("award_decisions")
        .select(
          "portal_award_id, winner_name, winner_jib, winning_price, contract_type, award_date, total_bidders_count, discount_pct, procedure_type, contracting_authority_jib"
        )
        .in("contracting_authority_jib", relevantAuthorityJibs)
        .not("winner_jib", "is", null)
        .order("award_date", { ascending: false })
        .limit(2000)
    : { data: [] };

  const awardMap = new Map<string, AwardRow>();
  for (const award of [...(categoryAwards ?? []), ...(authorityAwards ?? [])] as AwardRow[]) {
    awardMap.set(award.portal_award_id, award);
  }

  const matchedCategorySet = new Set(matchedCategories);
  const matchedAuthoritySet = new Set(relevantAuthorityJibs);
  const competitorMap = new Map<string, CompetitorAccumulator>();
  const authorityInsightMap = new Map<
    string,
    {
      jib: string | null;
      name: string;
      city: string | null;
      authority_type: string | null;
      awards: number;
      total_value: number;
      winners: Set<string>;
    }
  >();

  for (const award of awardMap.values()) {
    if (!award.winner_jib || award.winner_jib === company.jib) {
      continue;
    }

    const authorityJib = award.contracting_authority_jib;
    const authorityMeta = authorityJib ? authorityMap.get(authorityJib) : null;
    const authorityName = authorityJib
      ? authorityMeta?.name ?? authorityNameFallbackMap.get(authorityJib) ?? authorityJib
      : "Nepoznat naručilac";
    const price = Number(award.winning_price) || 0;
    const bidders = Number(award.total_bidders_count);
    const discount = Number(award.discount_pct);
    const existing = competitorMap.get(award.winner_jib);
    const isRecent = Boolean(award.award_date && award.award_date >= ninetyDaysAgo);
    const isCategoryMatch = Boolean(award.contract_type && matchedCategorySet.has(award.contract_type));
    const isAuthorityMatch = Boolean(authorityJib && matchedAuthoritySet.has(authorityJib));

    if (existing) {
      existing.wins += 1;
      existing.totalValue += price;
      if (award.contract_type) {
        existing.categories.add(award.contract_type);
      }
      if (award.procedure_type) {
        existing.procedures.add(award.procedure_type);
      }
      if (authorityJib) {
        existing.authorityJibs.add(authorityJib);
        existing.authorityCounts.set(authorityName, (existing.authorityCounts.get(authorityName) ?? 0) + 1);
      }
      if (award.award_date && (!existing.lastWinDate || award.award_date > existing.lastWinDate)) {
        existing.lastWinDate = award.award_date;
      }
      if (isRecent) {
        existing.recentWins90d += 1;
        existing.recentValue90d += price;
      }
      if (Number.isFinite(bidders)) {
        existing.biddersSum += bidders;
        existing.biddersCount += 1;
      }
      if (Number.isFinite(discount)) {
        existing.discountSum += discount;
        existing.discountCount += 1;
      }
      if (isCategoryMatch) {
        existing.categoryMatchWins += 1;
      }
      if (isAuthorityMatch) {
        existing.authorityMatchWins += 1;
      }
    } else {
      const authorityCounts = new Map<string, number>();
      if (authorityJib) {
        authorityCounts.set(authorityName, 1);
      }

      competitorMap.set(award.winner_jib, {
        name: award.winner_name ?? award.winner_jib,
        jib: award.winner_jib,
        wins: 1,
        totalValue: price,
        categories: new Set(award.contract_type ? [award.contract_type] : []),
        procedures: new Set(award.procedure_type ? [award.procedure_type] : []),
        authorityJibs: new Set(authorityJib ? [authorityJib] : []),
        authorityCounts,
        lastWinDate: award.award_date,
        recentWins90d: isRecent ? 1 : 0,
        recentValue90d: isRecent ? price : 0,
        biddersSum: Number.isFinite(bidders) ? bidders : 0,
        biddersCount: Number.isFinite(bidders) ? 1 : 0,
        discountSum: Number.isFinite(discount) ? discount : 0,
        discountCount: Number.isFinite(discount) ? 1 : 0,
        categoryMatchWins: isCategoryMatch ? 1 : 0,
        authorityMatchWins: isAuthorityMatch ? 1 : 0,
      });
    }

    const authorityKey = authorityJib ?? authorityName;
    const authorityInsight = authorityInsightMap.get(authorityKey);
    if (authorityInsight) {
      authorityInsight.awards += 1;
      authorityInsight.total_value += price;
      authorityInsight.winners.add(award.winner_jib);
    } else {
      authorityInsightMap.set(authorityKey, {
        jib: authorityJib ?? null,
        name: authorityName,
        city: authorityMeta?.city ?? null,
        authority_type: authorityMeta?.authority_type ?? null,
        awards: 1,
        total_value: price,
        winners: new Set([award.winner_jib]),
      });
    }
  }

  const competitorJibs = [...competitorMap.keys()].slice(0, 200);
  const { data: marketCompanies } = competitorJibs.length > 0
    ? await supabase
        .from("market_companies")
        .select(
          "jib, win_rate, total_bids_count, total_wins_count, total_won_value, city, municipality"
        )
        .in("jib", competitorJibs)
    : { data: [] };

  const marketCompanyMap = new Map<string, MarketCompanyRow>(
    ((marketCompanies ?? []) as MarketCompanyRow[]).map((companyRow) => [companyRow.jib, companyRow])
  );

  const competitors = [...competitorMap.values()]
    .map<CompetitorInsight>((competitor) => {
      const marketCompany = marketCompanyMap.get(competitor.jib);
      const avgAwardValue = competitor.wins > 0 ? competitor.totalValue / competitor.wins : null;
      const signalScore =
        competitor.wins * 4 +
        competitor.recentWins90d * 6 +
        competitor.authorityMatchWins * 3 +
        competitor.categoryMatchWins * 3 +
        (marketCompany?.win_rate ?? 0) / 10 +
        competitor.totalValue / 100000;

      return {
        name: competitor.name,
        jib: competitor.jib,
        wins: competitor.wins,
        total_value: competitor.totalValue,
        categories: [...competitor.categories],
        procedure_types: [...competitor.procedures],
        last_win_date: competitor.lastWinDate,
        win_rate: marketCompany?.win_rate ?? null,
        total_bids: marketCompany?.total_bids_count ?? null,
        total_market_wins: marketCompany?.total_wins_count ?? null,
        total_market_value: marketCompany?.total_won_value ?? null,
        city: marketCompany?.city ?? null,
        municipality: marketCompany?.municipality ?? null,
        recent_wins_90d: competitor.recentWins90d,
        recent_value_90d: competitor.recentValue90d,
        avg_award_value: avgAwardValue ? round(avgAwardValue, 0) : null,
        avg_discount:
          competitor.discountCount > 0 ? round(competitor.discountSum / competitor.discountCount) : null,
        avg_bidders:
          competitor.biddersCount > 0 ? round(competitor.biddersSum / competitor.biddersCount) : null,
        authority_count: competitor.authorityJibs.size,
        top_authorities: [...competitor.authorityCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name),
        category_match_wins: competitor.categoryMatchWins,
        authority_match_wins: competitor.authorityMatchWins,
        signal_score: round(signalScore, 1),
      };
    })
    .sort(
      (a, b) =>
        b.signal_score - a.signal_score ||
        b.recent_wins_90d - a.recent_wins_90d ||
        b.wins - a.wins ||
        b.total_value - a.total_value
    )
    .slice(0, 30);

  const authorities = [...authorityInsightMap.values()]
    .map<AuthorityMarketInsight>((authority) => ({
      jib: authority.jib,
      name: authority.name,
      city: authority.city,
      authority_type: authority.authority_type,
      awards: authority.awards,
      total_value: authority.total_value,
      unique_winners: authority.winners.size,
    }))
    .sort((a, b) => b.awards - a.awards || b.total_value - a.total_value)
    .slice(0, 8);

  return {
    competitors,
    authorities,
    sourceTerms: searchTerms,
    matchedCategories,
    matchedAuthorityCount: relevantAuthorityJibs.length,
    trackedAwardsCount: awardMap.size,
    totalCompetitorValue: competitors.reduce((sum, competitor) => sum + competitor.total_value, 0),
    totalCompetitorWins: competitors.reduce((sum, competitor) => sum + competitor.wins, 0),
  };
}

export async function getMarketOverview(
  supabase: SupabaseClient<Database>
): Promise<MarketOverviewResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const ninetyDaysForward = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [{ count: activeTenderCount }, { data: activeTenders }, { data: yearAwards }, { data: recentAwards }, { data: monthTenders }, { data: upcomingPlansData }] = await Promise.all([
    supabase.from("tenders").select("id", { count: "exact", head: true }).gte("deadline", nowIso),
    supabase
      .from("tenders")
      .select("estimated_value")
      .gte("deadline", nowIso)
      .not("estimated_value", "is", null),
    supabase
      .from("award_decisions")
      .select(
        "winner_name, winner_jib, winning_price, contract_type, procedure_type, award_date, total_bidders_count, discount_pct"
      )
      .gte("award_date", startOfYear)
      .not("winner_jib", "is", null)
      .not("winning_price", "is", null),
    supabase
      .from("award_decisions")
      .select("winning_price, total_bidders_count, discount_pct")
      .gte("award_date", ninetyDaysAgo),
    supabase
      .from("tenders")
      .select("contracting_authority, contracting_authority_jib, estimated_value")
      .gte("created_at", startOfMonth)
      .not("contracting_authority", "is", null),
    supabase
      .from("planned_procurements")
      .select(
        "id, description, planned_date, estimated_value, contract_type, contracting_authorities(name, jib)"
      )
      .gte("planned_date", nowIso.split("T")[0])
      .lte("planned_date", ninetyDaysForward)
      .order("planned_date", { ascending: true })
      .limit(8),
  ]);

  const activeTenderValue = (activeTenders ?? []).reduce(
    (sum, tender) => sum + (Number(tender.estimated_value) || 0),
    0
  );

  const yearAwardValue = (yearAwards ?? []).reduce(
    (sum, award) => sum + (Number(award.winning_price) || 0),
    0
  );

  const plannedCount90d = (upcomingPlansData ?? []).length;
  const plannedValue90d = (upcomingPlansData ?? []).reduce(
    (sum, plan) => sum + (Number(plan.estimated_value) || 0),
    0
  );

  const recentAwardValues = (recentAwards ?? []).map((award) => Number(award.winning_price) || 0);
  const recentBidders = (recentAwards ?? [])
    .map((award) => Number(award.total_bidders_count))
    .filter((value) => Number.isFinite(value));
  const recentDiscounts = (recentAwards ?? [])
    .map((award) => Number(award.discount_pct))
    .filter((value) => Number.isFinite(value));

  const avgAwardValue90d = recentAwardValues.length > 0
    ? round(recentAwardValues.reduce((sum, value) => sum + value, 0) / recentAwardValues.length, 0)
    : null;
  const avgBidders90d = recentBidders.length > 0
    ? round(recentBidders.reduce((sum, value) => sum + value, 0) / recentBidders.length)
    : null;
  const avgDiscount90d = recentDiscounts.length > 0
    ? round(recentDiscounts.reduce((sum, value) => sum + value, 0) / recentDiscounts.length)
    : null;

  const categoryMap = new Map<string, MarketCategoryInsight>();
  const procedureMap = new Map<
    string,
    { procedure_type: string; count: number; total_value: number; bidders_sum: number; bidders_count: number; discount_sum: number; discount_count: number }
  >();
  const monthlyMap = new Map<string, { month_key: string; label: string; count: number; total_value: number }>();
  const winnerMap = new Map<string, { name: string; jib: string; wins: number; total_value: number }>();

  for (const award of yearAwards ?? []) {
    const category = award.contract_type ?? "Ostalo";
    const procedure = award.procedure_type ?? "Nepoznato";
    const price = Number(award.winning_price) || 0;
    const awardDate = award.award_date ? new Date(award.award_date) : null;
    const monthKey = awardDate ? award.award_date!.slice(0, 7) : "nepoznato";
    const monthLabel = awardDate
      ? awardDate.toLocaleDateString("bs-BA", { month: "short", year: "numeric" })
      : "Nepoznato";
    const bidders = Number(award.total_bidders_count);
    const discount = Number(award.discount_pct);

    const categoryEntry = categoryMap.get(category);
    if (categoryEntry) {
      categoryEntry.count += 1;
      categoryEntry.total_value += price;
    } else {
      categoryMap.set(category, { category, count: 1, total_value: price });
    }

    const procedureEntry = procedureMap.get(procedure);
    if (procedureEntry) {
      procedureEntry.count += 1;
      procedureEntry.total_value += price;
      if (Number.isFinite(bidders)) {
        procedureEntry.bidders_sum += bidders;
        procedureEntry.bidders_count += 1;
      }
      if (Number.isFinite(discount)) {
        procedureEntry.discount_sum += discount;
        procedureEntry.discount_count += 1;
      }
    } else {
      procedureMap.set(procedure, {
        procedure_type: procedure,
        count: 1,
        total_value: price,
        bidders_sum: Number.isFinite(bidders) ? bidders : 0,
        bidders_count: Number.isFinite(bidders) ? 1 : 0,
        discount_sum: Number.isFinite(discount) ? discount : 0,
        discount_count: Number.isFinite(discount) ? 1 : 0,
      });
    }

    const monthlyEntry = monthlyMap.get(monthKey);
    if (monthlyEntry) {
      monthlyEntry.count += 1;
      monthlyEntry.total_value += price;
    } else {
      monthlyMap.set(monthKey, {
        month_key: monthKey,
        label: monthLabel,
        count: 1,
        total_value: price,
      });
    }

    if (award.winner_jib) {
      const winnerEntry = winnerMap.get(award.winner_jib);
      if (winnerEntry) {
        winnerEntry.wins += 1;
        winnerEntry.total_value += price;
      } else {
        winnerMap.set(award.winner_jib, {
          name: award.winner_name ?? award.winner_jib,
          jib: award.winner_jib,
          wins: 1,
          total_value: price,
        });
      }
    }
  }

  const topAuthoritiesBase = new Map<string, { name: string; jib: string | null; count: number; total_value: number }>();
  for (const tender of monthTenders ?? []) {
    const key = tender.contracting_authority ?? "Nepoznat naručilac";
    const entry = topAuthoritiesBase.get(key);
    const amount = Number(tender.estimated_value) || 0;
    if (entry) {
      entry.count += 1;
      entry.total_value += amount;
    } else {
      topAuthoritiesBase.set(key, {
        name: key,
        jib: tender.contracting_authority_jib,
        count: 1,
        total_value: amount,
      });
    }
  }

  const authorityJibs = uniqueStrings(
    [...topAuthoritiesBase.values()].map((authority) => authority.jib)
  );
  const { data: authorityMetaRows } = authorityJibs.length > 0
    ? await supabase
        .from("contracting_authorities")
        .select("jib, name, city, authority_type")
        .in("jib", authorityJibs)
    : { data: [] };

  const authorityMetaMap = new Map<string, AuthorityRow>(
    ((authorityMetaRows ?? []) as AuthorityRow[]).map((authority) => [authority.jib, authority])
  );

  const topAuthorities = [...topAuthoritiesBase.values()]
    .map<MarketAuthorityInsight>((authority) => {
      const meta = authority.jib ? authorityMetaMap.get(authority.jib) : null;
      return {
        name: meta?.name ?? authority.name,
        jib: authority.jib,
        count: authority.count,
        total_value: authority.total_value,
        city: meta?.city ?? null,
        authority_type: meta?.authority_type ?? null,
      };
    })
    .sort((a, b) => b.count - a.count || b.total_value - a.total_value)
    .slice(0, 10);

  const topWinnerCandidates = [...winnerMap.values()]
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 20);
  const winnerJibs = topWinnerCandidates.map((winner) => winner.jib);
  const { data: winnerMarketRows } = winnerJibs.length > 0
    ? await supabase
        .from("market_companies")
        .select("jib, win_rate, total_bids_count, city, municipality")
        .in("jib", winnerJibs)
    : { data: [] };

  const winnerMarketMap = new Map<
    string,
    Pick<MarketCompanyRow, "jib" | "win_rate" | "total_bids_count" | "city" | "municipality">
  >(((winnerMarketRows ?? []) as Pick<MarketCompanyRow, "jib" | "win_rate" | "total_bids_count" | "city" | "municipality">[]).map((row) => [row.jib, row]));

  return {
    activeTenderCount: activeTenderCount ?? 0,
    activeTenderValue,
    yearAwardValue,
    plannedCount90d,
    plannedValue90d,
    avgDiscount90d,
    avgBidders90d,
    avgAwardValue90d,
    categoryData: [...categoryMap.values()].sort((a, b) => b.count - a.count),
    procedureData: [...procedureMap.values()]
      .map<MarketProcedureInsight>((procedure) => ({
        procedure_type: procedure.procedure_type,
        count: procedure.count,
        total_value: procedure.total_value,
        avg_bidders:
          procedure.bidders_count > 0 ? round(procedure.bidders_sum / procedure.bidders_count) : null,
        avg_discount:
          procedure.discount_count > 0 ? round(procedure.discount_sum / procedure.discount_count) : null,
      }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 6),
    monthlyAwards: [...monthlyMap.values()]
      .sort((a, b) => a.month_key.localeCompare(b.month_key))
      .slice(-6),
    topAuthorities,
    topWinners: topWinnerCandidates.map<MarketWinnerInsight>((winner) => ({
      name: winner.name,
      jib: winner.jib,
      wins: winner.wins,
      total_value: winner.total_value,
      win_rate: winnerMarketMap.get(winner.jib)?.win_rate ?? null,
      total_bids: winnerMarketMap.get(winner.jib)?.total_bids_count ?? null,
      city: winnerMarketMap.get(winner.jib)?.city ?? null,
      municipality: winnerMarketMap.get(winner.jib)?.municipality ?? null,
    })).slice(0, 10),
    upcomingPlans: ((upcomingPlansData ?? []) as MarketUpcomingInsight[]),
  };
}
