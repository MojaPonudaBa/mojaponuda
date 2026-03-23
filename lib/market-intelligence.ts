import type { SupabaseClient } from "@supabase/supabase-js";
import type { Company, Database } from "@/types/database";
import {
  buildProfileKeywordSeeds,
  getPreferredContractTypes,
  parseCompanyProfile,
  sanitizeSearchKeywords,
} from "@/lib/company-profile";
import { buildRegionSearchTerms } from "@/lib/constants/regions";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  matchesCpvPrefixes,
  matchesPreferredContractTypes,
  type RecommendationTenderInput,
  type ScoredTenderRecommendation,
  scoreTenderRecommendation,
  selectTenderRecommendations,
} from "@/lib/tender-recommendations";

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
  strongTenderWins: number;
  fallbackTenderWins: number;
}

interface FilteredCompetitorAward {
  award: AwardRow;
  isCategoryMatch: boolean;
  isAuthorityMatch: boolean;
  strongTenderMatch: boolean;
  strongFallbackTenderMatch: boolean;
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
  matchedTenderCount: number;
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
  contracting_authorities: {
    name: string;
    jib: string;
    city?: string | null;
    municipality?: string | null;
    canton?: string | null;
    entity?: string | null;
  } | null;
}

export interface MarketOverviewResult {
  activeTenderCount: number;
  activeTenderValue: number;
  activeTenderValueKnownCount: number;
  yearAwardValue: number;
  plannedCount90d: number;
  plannedValue90d: number;
  plannedValueKnownCount: number;
  avgDiscount90d: number | null;
  avgDiscountSampleCount: number;
  avgBidders90d: number | null;
  avgBiddersSampleCount: number;
  avgAwardValue90d: number | null;
  categoryData: MarketCategoryInsight[];
  procedureData: MarketProcedureInsight[];
  monthlyAwards: MarketMonthlyInsight[];
  topAuthorities: MarketAuthorityInsight[];
  topWinners: MarketWinnerInsight[];
  upcomingPlans: MarketUpcomingInsight[];
  sourceTerms: string[];
  matchedCategories: string[];
  matchedAuthorityCount: number;
  matchedAuthorityJibs: string[];
  profileScoped: boolean;
}

type AwardRow = Pick<
  Database["public"]["Tables"]["award_decisions"]["Row"],
  | "portal_award_id"
  | "tender_id"
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
  "jib" | "name" | "city" | "municipality" | "canton" | "entity" | "authority_type"
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

type TenderScopeRow = Pick<
  Database["public"]["Tables"]["tenders"]["Row"],
  | "id"
  | "title"
  | "raw_description"
  | "contract_type"
  | "contracting_authority"
  | "contracting_authority_jib"
  | "estimated_value"
  | "deadline"
  | "created_at"
> & {
  authority_city?: string | null;
  authority_municipality?: string | null;
  authority_canton?: string | null;
  authority_entity?: string | null;
};

interface PlannedScopeRow extends MarketUpcomingInsight {
  cpv_code: string | null;
}

interface ScoredPlannedScopeRow {
  plan: PlannedScopeRow;
  score: number;
  positiveSignalCount: number;
  locationPriority: number;
  qualifies: boolean;
  fallbackEligible: boolean;
}

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
    .map((term) => term.replace(/[,%()]/g, " ").trim())
    .filter(Boolean)
    .map((term) => `title.ilike.%${term}%,raw_description.ilike.%${term}%`)
    .join(",");
}

function countTermMatches(text: string | null | undefined, terms: string[]): number {
  if (!text) {
    return 0;
  }

  const normalizedText = text.toLowerCase();
  return terms.reduce(
    (sum, term) => sum + (normalizedText.includes(term.toLowerCase()) ? 1 : 0),
    0
  );
}

function hasRegionMatch(
  fields: Array<string | null | undefined>,
  operatingRegions: string[]
): boolean {
  if (operatingRegions.length === 0) {
    return true;
  }

  return fields.some((field) => scoreRegionMatch(field, operatingRegions) > 0);
}

function matchesPreferredContractType(
  contractType: string | null | undefined,
  preferredContractTypes: string[]
): boolean {
  return matchesPreferredContractTypes(contractType, preferredContractTypes);
}

function matchesProfileScope(
  fields: Array<string | null | undefined>,
  contractType: string | null | undefined,
  searchTerms: string[],
  operatingRegions: string[],
  preferredContractTypes: string[]
): boolean {
  const hasScope =
    searchTerms.length > 0 ||
    operatingRegions.length > 0 ||
    preferredContractTypes.length > 0;

  if (!hasScope) {
    return false;
  }

  const keywordMatch =
    searchTerms.length === 0 ||
    fields.some((field) => countTermMatches(field, searchTerms) > 0);
  const regionMatch = hasRegionMatch(fields, operatingRegions);
  const contractTypeMatch = matchesPreferredContractType(
    contractType,
    preferredContractTypes
  );

  return keywordMatch && regionMatch && contractTypeMatch;
}

function withAuthorityLocation<T extends { contracting_authority_jib: string | null }>(
  rows: T[],
  authorityMap: Map<string, AuthorityRow>
): Array<
  T & {
    authority_city: string | null;
    authority_municipality: string | null;
    authority_canton: string | null;
    authority_entity: string | null;
  }
> {
  return rows.map((row) => {
    const authority = row.contracting_authority_jib
      ? authorityMap.get(row.contracting_authority_jib)
      : null;

    return {
      ...row,
      authority_city: authority?.city ?? null,
      authority_municipality: authority?.municipality ?? null,
      authority_canton: authority?.canton ?? null,
      authority_entity: authority?.entity ?? null,
    };
  });
}

function scoreMarketFit(
  fields: Array<string | null | undefined>,
  searchTerms: string[],
  operatingRegions: string[]
): number {
  const keywordScore = fields.reduce(
    (sum, field) => sum + countTermMatches(field, searchTerms),
    0
  );
  const regionScore = fields.reduce(
    (sum, field) => sum + scoreRegionMatch(field, operatingRegions),
    0
  );

  return keywordScore * 3 + regionScore;
}

function compareScoredPlans(a: ScoredPlannedScopeRow, b: ScoredPlannedScopeRow): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  if (a.positiveSignalCount !== b.positiveSignalCount) {
    return b.positiveSignalCount - a.positiveSignalCount;
  }

  if (a.locationPriority !== b.locationPriority) {
    return a.locationPriority - b.locationPriority;
  }

  return new Date(a.plan.planned_date ?? 0).getTime() - new Date(b.plan.planned_date ?? 0).getTime();
}

function isStrongCompetitorFallbackMatch(
  recommendation:
    | Pick<
        ScoredTenderRecommendation<RecommendationTenderInput>,
        | "fallbackEligible"
        | "positiveSignalCount"
        | "score"
        | "locationScope"
        | "cpvMatch"
        | "titleMatches"
        | "matchedKeywords"
      >
    | null
): boolean {
  if (!recommendation?.fallbackEligible) {
    return false;
  }

  if (recommendation.locationScope === "broad") {
    return false;
  }

  if (recommendation.score < 4 || recommendation.positiveSignalCount < 3) {
    return false;
  }

  return (
    recommendation.cpvMatch ||
    recommendation.titleMatches.length > 0 ||
    recommendation.matchedKeywords.length >= 2
  );
}

function scoreUpcomingPlan(
  plan: PlannedScopeRow,
  recommendationContext: NonNullable<ReturnType<typeof buildRecommendationContext>>,
  searchTerms: string[],
  preferredContractTypes: string[],
  matchedCategories: string[],
  matchedAuthorityJibs: string[],
  cpvPrefixes: string[]
): ScoredPlannedScopeRow {
  const fields = [
    plan.description,
    plan.contract_type,
    plan.cpv_code,
    plan.contracting_authorities?.name,
    plan.contracting_authorities?.city,
    plan.contracting_authorities?.municipality,
    plan.contracting_authorities?.canton,
    plan.contracting_authorities?.entity,
  ];
  const keywordMatches = fields.reduce((sum, field) => sum + countTermMatches(field, searchTerms), 0);
  const exactRegionMatch = hasRegionMatch(fields, recommendationContext.regionTerms);
  const sameGroupRegionMatch = hasRegionMatch(fields, recommendationContext.sameGroupRegionTerms);
  const neighboringRegionMatch = hasRegionMatch(fields, recommendationContext.neighboringRegionTerms);
  const hasLocationPreference = recommendationContext.regionTerms.length > 0;
  const locationPriority = exactRegionMatch ? 0 : sameGroupRegionMatch ? 1 : neighboringRegionMatch ? 2 : 3;
  const cpvMatch = matchesCpvPrefixes(plan.cpv_code, cpvPrefixes);
  const contractMatch =
    preferredContractTypes.length === 0 ||
    matchesPreferredContractTypes(plan.contract_type, preferredContractTypes);
  const authorityMatch = Boolean(
    plan.contracting_authorities?.jib && matchedAuthorityJibs.includes(plan.contracting_authorities.jib)
  );
  const categoryMatch = Boolean(
    plan.contract_type && matchedCategories.includes(plan.contract_type)
  );

  let score = keywordMatches * 4;
  score += cpvMatch ? 8 : 0;
  score += authorityMatch ? 4 : 0;
  score += categoryMatch ? 2 : 0;
  score += preferredContractTypes.length > 0 && contractMatch ? 2 : 0;
  score += exactRegionMatch ? 3 : sameGroupRegionMatch ? 2 : neighboringRegionMatch ? 1 : 0;

  const positiveSignalCount =
    keywordMatches +
    (cpvMatch ? 3 : 0) +
    (authorityMatch ? 2 : 0) +
    (categoryMatch ? 1 : 0) +
    (exactRegionMatch ? 2 : sameGroupRegionMatch ? 1 : neighboringRegionMatch ? 1 : 0);

  const hasPositiveSignal = cpvMatch || keywordMatches > 0 || authorityMatch || categoryMatch;
  const qualifies = contractMatch && hasPositiveSignal && (!hasLocationPreference || locationPriority < 3);
  const fallbackEligible = contractMatch && hasPositiveSignal && score >= 2;

  return {
    plan,
    score,
    positiveSignalCount,
    locationPriority,
    qualifies,
    fallbackEligible,
  };
}

function selectUpcomingPlans(
  plans: PlannedScopeRow[],
  recommendationContext: NonNullable<ReturnType<typeof buildRecommendationContext>>,
  searchTerms: string[],
  preferredContractTypes: string[],
  matchedCategories: string[],
  matchedAuthorityJibs: string[],
  cpvPrefixes: string[],
  minimumResults = 4,
  limit = 8
): PlannedScopeRow[] {
  const scored = plans.map((plan) =>
    scoreUpcomingPlan(
      plan,
      recommendationContext,
      searchTerms,
      preferredContractTypes,
      matchedCategories,
      matchedAuthorityJibs,
      cpvPrefixes
    )
  );
  const strict = scored.filter((item) => item.qualifies).sort(compareScoredPlans);
  const fallback = scored
    .filter((item) => !item.qualifies && item.fallbackEligible)
    .sort(compareScoredPlans);
  const selected = [...strict];

  if (selected.length < minimumResults) {
    const usedIds = new Set(selected.map((item) => item.plan.id));
    for (const item of fallback) {
      if (usedIds.has(item.plan.id)) {
        continue;
      }

      selected.push(item);
      usedIds.add(item.plan.id);

      if (selected.length >= minimumResults) {
        break;
      }
    }
  }

  return selected.slice(0, limit).map((item) => item.plan);
}

function isPlanRelevant(
  plan: PlannedScopeRow,
  searchTerms: string[],
  operatingRegions: string[],
  preferredContractTypes: string[],
  matchedCategories: string[],
  matchedAuthorityJibs: string[],
  cpvPrefixes: string[]
): boolean {
  const authorityMatch = Boolean(
    plan.contracting_authorities?.jib && matchedAuthorityJibs.includes(plan.contracting_authorities.jib)
  );
  const contractMatch =
    preferredContractTypes.length === 0 ||
    (plan.contract_type ? preferredContractTypes.includes(plan.contract_type) : false);
  const regionMatch = hasRegionMatch(
    [
      plan.description,
      plan.contracting_authorities?.name,
      plan.contracting_authorities?.city,
      plan.contracting_authorities?.municipality,
      plan.contracting_authorities?.canton,
      plan.contracting_authorities?.entity,
    ],
    operatingRegions
  );
  const cpvMatch = matchesCpvPrefixes(plan.cpv_code, cpvPrefixes);
  const cpvProfileMatch = cpvMatch && contractMatch && regionMatch;
  const profileMatch = matchesProfileScope(
    [
      plan.description,
      plan.contract_type,
      plan.cpv_code,
      plan.contracting_authorities?.name,
      plan.contracting_authorities?.city,
      plan.contracting_authorities?.municipality,
      plan.contracting_authorities?.canton,
      plan.contracting_authorities?.entity,
    ],
    plan.contract_type,
    searchTerms,
    operatingRegions,
    preferredContractTypes
  );

  if (operatingRegions.length > 0) {
    return authorityMatch || profileMatch || cpvProfileMatch;
  }

  return authorityMatch || profileMatch || cpvProfileMatch || Boolean(
    plan.contract_type && matchesPreferredContractTypes(plan.contract_type, matchedCategories)
  );
}

export async function getCompetitorAnalysis(
  supabase: SupabaseClient<Database>,
  company: Pick<Company, "jib" | "keywords" | "operating_regions" | "industry">
): Promise<CompetitorAnalysisResult> {
  const profile = parseCompanyProfile(company.industry);
  const recommendationContext = buildRecommendationContext(company);
  const searchTerms = buildSearchTerms(company);
  const operatingRegions = buildRegionSearchTerms(company.operating_regions ?? []);
  const preferredContractTypes = getPreferredContractTypes(
    profile.preferredTenderTypes
  );
  const hasProfileScope =
    searchTerms.length > 0 ||
    operatingRegions.length > 0 ||
    preferredContractTypes.length > 0;
  const nowIso = new Date().toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: ourAwards } = company.jib
    ? await supabase
        .from("award_decisions")
        .select("contract_type, contracting_authority_jib")
        .eq("winner_jib", company.jib)
        .limit(250)
    : { data: [] };

  let profileAuthorityRows: {
    contracting_authority_jib: string | null;
    contracting_authority: string | null;
    contract_type: string | null;
    title: string;
    raw_description: string | null;
    ai_analysis?: Database["public"]["Tables"]["tenders"]["Row"]["ai_analysis"];
    authority_city?: string | null;
    authority_municipality?: string | null;
    authority_canton?: string | null;
    authority_entity?: string | null;
  }[] = [];

  if (hasProfileScope) {
    const { data: tenderRows } = await supabase
      .from("tenders")
      .select("contracting_authority_jib, contracting_authority, contract_type, title, raw_description")
      .gt("deadline", nowIso)
      .limit(600);

    const tenderAuthorityJibs = uniqueStrings(
      ((tenderRows ?? []) as typeof profileAuthorityRows).map((row) => row.contracting_authority_jib)
    );
    const { data: tenderAuthorityRows } = tenderAuthorityJibs.length > 0
      ? await supabase
          .from("contracting_authorities")
          .select("jib, name, city, municipality, canton, entity, authority_type")
          .in("jib", tenderAuthorityJibs)
      : { data: [] };
    const tenderAuthorityMap = new Map<string, AuthorityRow>(
      ((tenderAuthorityRows ?? []) as AuthorityRow[]).map((authority) => [authority.jib, authority])
    );
    const scopedTenderRows = withAuthorityLocation(
      (tenderRows ?? []) as typeof profileAuthorityRows,
      tenderAuthorityMap
    );

    profileAuthorityRows = scopedTenderRows
      .filter((tender) =>
        matchesProfileScope(
          [
            tender.title,
            tender.raw_description,
            tender.contracting_authority,
            tender.contract_type,
            tender.authority_city,
            tender.authority_municipality,
            tender.authority_canton,
            tender.authority_entity,
          ],
          tender.contract_type,
          searchTerms,
          operatingRegions,
          preferredContractTypes
        )
      )
      .sort((a, b) => {
        const scoreA =
          scoreRegionMatch(a.contracting_authority, operatingRegions) +
          scoreRegionMatch(a.authority_city, operatingRegions) +
          scoreRegionMatch(a.authority_municipality, operatingRegions) +
          scoreRegionMatch(a.authority_canton, operatingRegions) +
          scoreRegionMatch(a.authority_entity, operatingRegions) +
          scoreRegionMatch(a.title, operatingRegions) +
          scoreRegionMatch(a.raw_description, operatingRegions);
        const scoreB =
          scoreRegionMatch(b.contracting_authority, operatingRegions) +
          scoreRegionMatch(b.authority_city, operatingRegions) +
          scoreRegionMatch(b.authority_municipality, operatingRegions) +
          scoreRegionMatch(b.authority_canton, operatingRegions) +
          scoreRegionMatch(b.authority_entity, operatingRegions) +
          scoreRegionMatch(b.title, operatingRegions) +
          scoreRegionMatch(b.raw_description, operatingRegions);

        return scoreB - scoreA;
      })
      .slice(0, 250);
  }

  const matchedCategories = uniqueStrings([
    ...preferredContractTypes,
    ...(ourAwards ?? []).map((award) => award.contract_type),
    ...profileAuthorityRows.map((row) => row.contract_type),
  ]);
  const historicalAuthorityJibs = uniqueStrings(
    (ourAwards ?? []).map((award) => award.contracting_authority_jib)
  );

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
        .select("jib, name, city, municipality, canton, entity, authority_type")
        .in("jib", relevantAuthorityJibs)
    : { data: [] };

  const authorityMap = new Map<string, AuthorityRow>(
    ((authorityRows ?? []) as AuthorityRow[]).map((authority) => [authority.jib, authority])
  );

  const { data: categoryAwards } = matchedCategories.length > 0
    ? await supabase
        .from("award_decisions")
        .select(
          "portal_award_id, tender_id, winner_name, winner_jib, winning_price, contract_type, award_date, total_bidders_count, discount_pct, procedure_type, contracting_authority_jib"
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
          "portal_award_id, tender_id, winner_name, winner_jib, winning_price, contract_type, award_date, total_bidders_count, discount_pct, procedure_type, contracting_authority_jib"
        )
        .in("contracting_authority_jib", relevantAuthorityJibs)
        .not("winner_jib", "is", null)
        .order("award_date", { ascending: false })
        .limit(2000)
    : { data: [] };

  const awardRows = [...(categoryAwards ?? []), ...(authorityAwards ?? [])] as AwardRow[];

  const awardTenderIds = uniqueStrings(awardRows.map((award) => award.tender_id));
  const { data: awardTenderRows } = awardTenderIds.length > 0
    ? await supabase
        .from("tenders")
        .select(
          "id, title, raw_description, contract_type, contracting_authority, contracting_authority_jib, deadline, estimated_value, ai_analysis"
        )
        .in("id", awardTenderIds)
    : { data: [] };
  const awardScopedTenders = withAuthorityLocation(
    ((awardTenderRows ?? []) as Array<{
      id: string;
      title: string;
      raw_description: string | null;
      contract_type: string | null;
      contracting_authority: string | null;
      contracting_authority_jib: string | null;
      deadline: string | null;
      estimated_value: number | null;
      ai_analysis: Database["public"]["Tables"]["tenders"]["Row"]["ai_analysis"];
    }>),
    authorityMap
  );
  const awardTenderScoreMap = new Map(
    awardScopedTenders.map((tender) => [tender.id, scoreTenderRecommendation(tender, recommendationContext)])
  );

  const missingAuthorityJibs = uniqueStrings(
    awardRows.map((award) => award.contracting_authority_jib).filter((jib) => jib && !authorityMap.has(jib))
  );
  if (missingAuthorityJibs.length > 0) {
    const { data: fallbackAuthorityRows } = await supabase
      .from("contracting_authorities")
      .select("jib, name, city, municipality, canton, entity, authority_type")
      .in("jib", missingAuthorityJibs);

    for (const authority of (fallbackAuthorityRows ?? []) as AuthorityRow[]) {
      authorityMap.set(authority.jib, authority);
    }
  }

  const filteredAwardMap = new Map<string, FilteredCompetitorAward>();
  const matchedCategorySet = new Set(matchedCategories);
  const matchedAuthoritySet = new Set(relevantAuthorityJibs);
  for (const award of awardRows) {
    const authorityJib = award.contracting_authority_jib;
    const authorityMeta = authorityJib ? authorityMap.get(authorityJib) : null;
    const authorityName = authorityJib
      ? authorityMeta?.name ?? authorityNameFallbackMap.get(authorityJib) ?? authorityJib
      : "Nepoznat naručilac";
    const isCategoryMatch = Boolean(award.contract_type && matchedCategorySet.has(award.contract_type));
    const isAuthorityMatch = Boolean(authorityJib && matchedAuthoritySet.has(authorityJib));
    const isProfileMatch = matchesProfileScope(
      [
        award.contract_type,
        authorityName,
        authorityMeta?.city,
        authorityMeta?.municipality,
        authorityMeta?.canton,
        authorityMeta?.entity,
        authorityMeta?.authority_type,
      ],
      award.contract_type,
      searchTerms,
      operatingRegions,
      preferredContractTypes
    );
    const linkedTenderScore = award.tender_id ? awardTenderScoreMap.get(award.tender_id) ?? null : null;
    const regionMatch = hasRegionMatch(
      [
        authorityName,
        authorityMeta?.city,
        authorityMeta?.municipality,
        authorityMeta?.canton,
        authorityMeta?.entity,
        authorityMeta?.authority_type,
      ],
      operatingRegions
    );
    const strongTenderMatch = Boolean(linkedTenderScore?.qualifies);
    const strongFallbackTenderMatch = isStrongCompetitorFallbackMatch(linkedTenderScore);
    const hasBusinessSignalInProfile =
      searchTerms.length > 0 || recommendationContext.cpvPrefixes.length > 0;
    const strongAuthorityEvidence =
      isAuthorityMatch &&
      isProfileMatch &&
      (operatingRegions.length === 0 || regionMatch) &&
      (searchTerms.length === 0 || isCategoryMatch);

    if (
      linkedTenderScore &&
      !linkedTenderScore.qualifies &&
      !strongFallbackTenderMatch
    ) {
      continue;
    }

    if (!linkedTenderScore && hasBusinessSignalInProfile) {
      continue;
    }

    if (!(isCategoryMatch || isAuthorityMatch || isProfileMatch)) {
      continue;
    }

    if (operatingRegions.length > 0 && !regionMatch) {
      continue;
    }

    if (!matchesPreferredContractType(award.contract_type, preferredContractTypes)) {
      continue;
    }

    const passesEvidenceGate =
      strongTenderMatch ||
      strongFallbackTenderMatch ||
      strongAuthorityEvidence ||
      (!hasBusinessSignalInProfile && isAuthorityMatch && isCategoryMatch && regionMatch);

    if (!passesEvidenceGate) {
      continue;
    }

    filteredAwardMap.set(award.portal_award_id, {
      award,
      isCategoryMatch,
      isAuthorityMatch,
      strongTenderMatch,
      strongFallbackTenderMatch,
    });
  }

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

  for (const filteredAward of filteredAwardMap.values()) {
    const {
      award,
      isCategoryMatch,
      isAuthorityMatch,
      strongTenderMatch,
      strongFallbackTenderMatch,
    } = filteredAward;

    if (!award.winner_jib || award.winner_jib === company.jib) {
      continue;
    }

    const authorityJib = award.contracting_authority_jib;
    const authorityMeta = authorityJib ? authorityMap.get(authorityJib) : null;
    const authorityName = authorityJib
      ? authorityMeta?.name ?? authorityNameFallbackMap.get(authorityJib) ?? authorityJib
      : "Nepoznat naručilac";
    const price = Number(award.winning_price) || 0;
    const bidders =
      award.total_bidders_count === null || award.total_bidders_count === undefined
        ? null
        : Number(award.total_bidders_count);
    const discount =
      award.discount_pct === null || award.discount_pct === undefined
        ? null
        : Number(award.discount_pct);
    const existing = competitorMap.get(award.winner_jib);
    const isRecent = Boolean(award.award_date && award.award_date >= ninetyDaysAgo);

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
      if (typeof bidders === "number" && Number.isFinite(bidders) && bidders > 0) {
        existing.biddersSum += bidders;
        existing.biddersCount += 1;
      }
      if (typeof discount === "number" && Number.isFinite(discount)) {
        existing.discountSum += discount;
        existing.discountCount += 1;
      }
      if (isCategoryMatch) {
        existing.categoryMatchWins += 1;
      }
      if (isAuthorityMatch) {
        existing.authorityMatchWins += 1;
      }
      if (strongTenderMatch) {
        existing.strongTenderWins += 1;
      }
      if (strongFallbackTenderMatch) {
        existing.fallbackTenderWins += 1;
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
        biddersSum: typeof bidders === "number" && Number.isFinite(bidders) && bidders > 0 ? bidders : 0,
        biddersCount: typeof bidders === "number" && Number.isFinite(bidders) && bidders > 0 ? 1 : 0,
        discountSum: typeof discount === "number" && Number.isFinite(discount) ? discount : 0,
        discountCount: typeof discount === "number" && Number.isFinite(discount) ? 1 : 0,
        categoryMatchWins: isCategoryMatch ? 1 : 0,
        authorityMatchWins: isAuthorityMatch ? 1 : 0,
        strongTenderWins: strongTenderMatch ? 1 : 0,
        fallbackTenderWins: strongFallbackTenderMatch ? 1 : 0,
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
    .filter(
      (competitor) =>
        competitor.strongTenderWins > 0 ||
        competitor.authorityMatchWins >= 2 ||
        competitor.fallbackTenderWins >= 2 ||
        (competitor.authorityMatchWins >= 1 && competitor.categoryMatchWins >= 2)
    )
    .map<CompetitorInsight>((competitor) => {
      const marketCompany = marketCompanyMap.get(competitor.jib);
      const avgAwardValue = competitor.wins > 0 ? competitor.totalValue / competitor.wins : null;
      const signalScore =
        competitor.wins * 4 +
        competitor.recentWins90d * 6 +
        competitor.authorityMatchWins * 4 +
        competitor.categoryMatchWins * 2 +
        competitor.strongTenderWins * 8 +
        competitor.fallbackTenderWins * 3 +
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
    matchedTenderCount: profileAuthorityRows.length,
    matchedAuthorityCount: relevantAuthorityJibs.length,
    trackedAwardsCount: filteredAwardMap.size,
    totalCompetitorValue: competitors.reduce((sum, competitor) => sum + competitor.total_value, 0),
    totalCompetitorWins: competitors.reduce((sum, competitor) => sum + competitor.wins, 0),
  };
}

export async function getMarketOverview(
  supabase: SupabaseClient<Database>,
  company?: Pick<Company, "jib" | "keywords" | "cpv_codes" | "operating_regions" | "industry">
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

  const profile = company ? parseCompanyProfile(company.industry) : null;
  const recommendationContext = company ? buildRecommendationContext(company) : null;
  const searchTerms = company ? buildSearchTerms(company) : [];
  const operatingRegions = company ? buildRegionSearchTerms(company.operating_regions ?? []) : [];
  const cpvPrefixes = recommendationContext?.cpvPrefixes ?? [];
  const preferredContractTypes = profile
    ? getPreferredContractTypes(profile.preferredTenderTypes)
    : [];
  const hasProfileScope =
    searchTerms.length > 0 ||
    operatingRegions.length > 0 ||
    preferredContractTypes.length > 0 ||
    cpvPrefixes.length > 0;
  const [
    { data: allYearAwards },
    { data: allUpcomingPlans },
    { data: ourAwards },
  ] = await Promise.all([
    supabase
      .from("award_decisions")
      .select(
        "portal_award_id, winner_name, winner_jib, winning_price, contract_type, procedure_type, award_date, total_bidders_count, discount_pct, contracting_authority_jib"
      )
      .gte("award_date", startOfYear)
      .not("winner_jib", "is", null)
      .not("winning_price", "is", null)
      .limit(4000),
    supabase
      .from("planned_procurements")
      .select(
        "id, description, planned_date, estimated_value, contract_type, cpv_code, contracting_authorities(name, jib, city, municipality, canton, entity)"
      )
      .gte("planned_date", nowIso.split("T")[0])
      .lte("planned_date", ninetyDaysForward)
      .order("planned_date", { ascending: true })
      .limit(300),
    company?.jib
      ? supabase
          .from("award_decisions")
          .select("contract_type, contracting_authority_jib")
          .eq("winner_jib", company.jib)
          .limit(500)
      : Promise.resolve({ data: [] }),
  ]);

  const matchedActiveTenders = company && recommendationContext && hasRecommendationSignals(recommendationContext)
    ? selectTenderRecommendations(
        await fetchRecommendedTenderCandidates<TenderScopeRow>(
          supabase,
          recommendationContext,
          {
            select:
              "id, title, raw_description, contract_type, contracting_authority, contracting_authority_jib, estimated_value, deadline, created_at",
            nowIso,
            limit: 240,
          }
        ),
        recommendationContext,
        { minimumResults: 4 }
      ).map(({ tender, score }) => ({
        ...tender,
        market_fit_score: score,
      }))
    : [];

  const tenderAuthorityJibs = uniqueStrings([
    ...matchedActiveTenders.map((row) => row.contracting_authority_jib),
    ...((allYearAwards ?? []) as AwardRow[]).map((row) => row.contracting_authority_jib),
  ]);
  const { data: tenderAuthorityRows } = tenderAuthorityJibs.length > 0
    ? await supabase
        .from("contracting_authorities")
        .select("jib, name, city, municipality, canton, entity, authority_type")
        .in("jib", tenderAuthorityJibs)
    : { data: [] };
  const tenderAuthorityMap = new Map<string, AuthorityRow>(
    ((tenderAuthorityRows ?? []) as AuthorityRow[]).map((authority) => [authority.jib, authority])
  );

  const matchedCategories = uniqueStrings([
    ...preferredContractTypes,
    ...matchedActiveTenders.map((tender) => tender.contract_type),
    ...((ourAwards ?? []) as Array<{ contract_type: string | null }>).map((award) => award.contract_type),
  ]);
  const matchedAuthorityJibs = uniqueStrings([
    ...matchedActiveTenders.map((tender) => tender.contracting_authority_jib),
    ...(operatingRegions.length === 0
      ? ((ourAwards ?? []) as Array<{ contracting_authority_jib: string | null }>).map(
          (award) => award.contracting_authority_jib
        )
      : []),
  ]);
  const profileScoped = hasProfileScope;

  const scopedYearAwards = profileScoped
    ? ((allYearAwards ?? []) as AwardRow[]).filter((award) => {
        const authorityMeta = award.contracting_authority_jib
          ? tenderAuthorityMap.get(award.contracting_authority_jib)
          : null;
        const categoryMatch = Boolean(
          award.contract_type && matchedCategories.includes(award.contract_type)
        );
        const authorityMatch = Boolean(
          award.contracting_authority_jib && matchedAuthorityJibs.includes(award.contracting_authority_jib)
        );
        const profileMatch = matchesProfileScope(
          [
            award.contract_type,
            authorityMeta?.name,
            authorityMeta?.city,
            authorityMeta?.municipality,
            authorityMeta?.canton,
            authorityMeta?.entity,
            authorityMeta?.authority_type,
          ],
          award.contract_type,
          searchTerms,
          operatingRegions,
          preferredContractTypes
        );

        return authorityMatch || profileMatch || (operatingRegions.length === 0 && categoryMatch);
      })
    : [];

  const scopedUpcomingPlansData = profileScoped && recommendationContext
    ? selectUpcomingPlans(
        ((allUpcomingPlans ?? []) as PlannedScopeRow[]).filter((plan) =>
          isPlanRelevant(
            plan,
            searchTerms,
            operatingRegions,
            preferredContractTypes,
            matchedCategories,
            matchedAuthorityJibs,
            cpvPrefixes
          ) ||
          countTermMatches(plan.description, searchTerms) > 0 ||
          matchesCpvPrefixes(plan.cpv_code, cpvPrefixes)
        ),
        recommendationContext,
        searchTerms,
        preferredContractTypes,
        matchedCategories,
        matchedAuthorityJibs,
        cpvPrefixes,
        5,
        8
      )
    : [];

  const useProfileScope = profileScoped;

  const yearAwards = scopedYearAwards;

  const recentAwards = yearAwards.filter(
    (award) => Boolean(award.award_date && award.award_date >= ninetyDaysAgo)
  );

  const upcomingPlansData = scopedUpcomingPlansData;

  const activeTenderSource = matchedActiveTenders;
  const activeTenderCount = matchedActiveTenders.length;
  const activeTenderValueKnownCount = activeTenderSource.filter(
    (tender) => tender.estimated_value !== null && tender.estimated_value !== undefined
  ).length;
  const activeTenderValue = activeTenderSource.reduce(
    (sum, tender) =>
      sum +
      (tender.estimated_value === null || tender.estimated_value === undefined
        ? 0
        : Number(tender.estimated_value) || 0),
    0
  );

  const yearAwardValue = yearAwards.reduce(
    (sum, award) => sum + (Number(award.winning_price) || 0),
    0
  );

  const plannedCount90d = upcomingPlansData.length;
  const plannedValueKnownCount = upcomingPlansData.filter(
    (plan) => plan.estimated_value !== null && plan.estimated_value !== undefined
  ).length;
  const plannedValue90d = upcomingPlansData.reduce(
    (sum, plan) =>
      sum +
      (plan.estimated_value === null || plan.estimated_value === undefined
        ? 0
        : Number(plan.estimated_value) || 0),
    0
  );

  const recentAwardValues = recentAwards.map((award) => Number(award.winning_price) || 0);
  const recentBidders = recentAwards
    .map((award) =>
      award.total_bidders_count === null || award.total_bidders_count === undefined
        ? null
        : Number(award.total_bidders_count)
    )
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  const recentDiscounts = recentAwards
    .map((award) =>
      award.discount_pct === null || award.discount_pct === undefined
        ? null
        : Number(award.discount_pct)
    )
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

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

  for (const award of yearAwards) {
    const category = award.contract_type ?? "Ostalo";
    const procedure = award.procedure_type ?? "Nepoznato";
    const price = Number(award.winning_price) || 0;
    const awardDate = award.award_date ? new Date(award.award_date) : null;
    const monthKey = awardDate ? award.award_date!.slice(0, 7) : "nepoznato";
    const monthLabel = awardDate
      ? awardDate.toLocaleDateString("bs-BA", { month: "short", year: "numeric" })
      : "Nepoznato";
    const bidders =
      award.total_bidders_count === null || award.total_bidders_count === undefined
        ? null
        : Number(award.total_bidders_count);
    const discount =
      award.discount_pct === null || award.discount_pct === undefined
        ? null
        : Number(award.discount_pct);

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
      if (typeof bidders === "number" && Number.isFinite(bidders) && bidders > 0) {
        procedureEntry.bidders_sum += bidders;
        procedureEntry.bidders_count += 1;
      }
      if (typeof discount === "number" && Number.isFinite(discount)) {
        procedureEntry.discount_sum += discount;
        procedureEntry.discount_count += 1;
      }
    } else {
      procedureMap.set(procedure, {
        procedure_type: procedure,
        count: 1,
        total_value: price,
        bidders_sum: typeof bidders === "number" && Number.isFinite(bidders) && bidders > 0 ? bidders : 0,
        bidders_count: typeof bidders === "number" && Number.isFinite(bidders) && bidders > 0 ? 1 : 0,
        discount_sum: typeof discount === "number" && Number.isFinite(discount) ? discount : 0,
        discount_count: typeof discount === "number" && Number.isFinite(discount) ? 1 : 0,
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

  const monthlyAwards = Array.from({ length: now.getMonth() + 1 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), index, 1);
    const monthKey = monthDate.toISOString().slice(0, 7);
    const label = monthDate.toLocaleDateString("bs-BA", {
      month: "short",
      year: "numeric",
    });
    const entry = monthlyMap.get(monthKey);

    return {
      month_key: monthKey,
      label,
      count: entry?.count ?? 0,
      total_value: entry?.total_value ?? 0,
    };
  });

  const topAuthoritiesBase = new Map<string, { name: string; jib: string | null; count: number; total_value: number }>();
  const currentMonthAuthorityTenders = activeTenderSource.filter((tender) => tender.created_at >= startOfMonth);
  const authorityTenderSource = currentMonthAuthorityTenders.length > 0
    ? currentMonthAuthorityTenders
    : activeTenderSource;
  for (const tender of authorityTenderSource) {
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
        .select("jib, name, city, municipality, canton, entity, authority_type")
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
    activeTenderCount,
    activeTenderValue,
    activeTenderValueKnownCount,
    yearAwardValue,
    plannedCount90d,
    plannedValue90d,
    plannedValueKnownCount,
    avgDiscount90d,
    avgDiscountSampleCount: recentDiscounts.length,
    avgBidders90d,
    avgBiddersSampleCount: recentBidders.length,
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
    monthlyAwards,
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
    upcomingPlans: upcomingPlansData,
    sourceTerms: searchTerms,
    matchedCategories,
    matchedAuthorityCount: matchedAuthorityJibs.length,
    matchedAuthorityJibs,
    profileScoped: useProfileScope,
  };
}
