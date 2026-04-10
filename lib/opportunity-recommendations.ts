import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRecommendationContext,
  type RecommendationCompanySource,
  type RecommendationContext,
} from "@/lib/tender-recommendations";
import type { Database } from "@/types/database";

export interface OpportunityRecommendationInput {
  id: string;
  slug: string;
  type: "tender" | "poticaj";
  title: string;
  issuer: string;
  category: string | null;
  subcategory: string | null;
  industry: string | null;
  value: number | null;
  deadline: string | null;
  location: string | null;
  requirements: string | null;
  eligibility_signals: string[] | null;
  description: string | null;
  status: "active" | "expired" | "draft";
  ai_summary: string | null;
  ai_who_should_apply: string | null;
  ai_difficulty: "lako" | "srednje" | "tesko" | null;
  created_at: string;
}

type OpportunityLocationScope = "selected" | "same_group" | "neighboring" | "broad";

export interface ScoredOpportunityRecommendation<
  TOpportunity extends OpportunityRecommendationInput,
> {
  opportunity: TOpportunity;
  score: number;
  qualifies: boolean;
  titleMatches: string[];
  categoryMatches: string[];
  eligibilityMatches: string[];
  textMatches: string[];
  matchedKeywords: string[];
  negativeMatches: string[];
  locationScope: OpportunityLocationScope;
  locationPriority: number;
  positiveSignalCount: number;
  reasons: string[];
}

interface FetchPublishedGrantCandidatesOptions {
  select?: string;
}

interface PersonalizedOpportunityOptions {
  company: RecommendationCompanySource;
  select?: string;
  excludeOpportunityIds?: Iterable<string>;
  limit?: number;
}

export interface PersonalizedOpportunityResult<
  TOpportunity extends OpportunityRecommendationInput,
> {
  context: RecommendationContext;
  personalized: Array<ScoredOpportunityRecommendation<TOpportunity>>;
  others: TOpportunity[];
}

function normalizeText(value: string | null | undefined): string {
  return value?.toLowerCase() ?? "";
}

function normalizeOpportunityKeyword(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized.length < 3) {
    return null;
  }

  return normalized;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

function buildKeywordRoots(keyword: string): string[] {
  const normalized = keyword.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  const words = normalized.split(/\s+/).filter((word) => word.length >= 3);

  return uniqueStrings(
    words.flatMap((word) => [
      word,
      word.length >= 6 ? word.slice(0, 6) : null,
      word.length >= 8 ? word.slice(0, 7) : null,
    ])
  );
}

function textMatchesKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return false;
  }

  if (text.includes(normalizedKeyword)) {
    return true;
  }

  const roots = buildKeywordRoots(normalizedKeyword);

  if (normalizedKeyword.includes(" ")) {
    const matchedRootCount = roots.filter((root) => root.length >= 5 && text.includes(root)).length;
    return matchedRootCount >= Math.min(2, roots.length);
  }

  return roots.some((root) => root.length >= 5 && text.includes(root));
}

export function buildOpportunityRecommendationContext(
  source: RecommendationCompanySource
): RecommendationContext {
  const baseContext = buildRecommendationContext(source);
  const explicitKeywords = uniqueStrings(
    (source.keywords ?? []).map((keyword) => normalizeOpportunityKeyword(keyword))
  );

  return {
    ...baseContext,
    keywords: uniqueStrings([...baseContext.keywords, ...explicitKeywords]).slice(0, 24),
  };
}

function getLocationPriority(scope: OpportunityLocationScope): number {
  switch (scope) {
    case "selected":
      return 0;
    case "same_group":
      return 1;
    case "neighboring":
      return 2;
    default:
      return 3;
  }
}

function matchesLocationTerms(
  values: Array<string | null | undefined>,
  regionTerms: string[]
): boolean {
  if (regionTerms.length === 0) {
    return true;
  }

  const normalizedValues = values.map((value) => normalizeText(value));

  return normalizedValues.some((value) =>
    regionTerms.some((region) => value.includes(region.toLowerCase()))
  );
}

export function hasOpportunityRecommendationSignals(
  context: RecommendationContext
): boolean {
  return context.keywords.length > 0 || context.regionTerms.length > 0;
}

export function getOpportunityLocationScope<
  TOpportunity extends OpportunityRecommendationInput,
>(
  opportunity: TOpportunity,
  context: Pick<
    RecommendationContext,
    "regionTerms" | "sameGroupRegionTerms" | "neighboringRegionTerms"
  >
): OpportunityLocationScope {
  const locationValues = [
    opportunity.location,
    opportunity.title,
    opportunity.description,
    opportunity.ai_who_should_apply,
  ];

  if (
    context.regionTerms.length > 0 &&
    matchesLocationTerms(locationValues, context.regionTerms)
  ) {
    return "selected";
  }

  if (
    context.sameGroupRegionTerms.length > 0 &&
    matchesLocationTerms(locationValues, context.sameGroupRegionTerms)
  ) {
    return "same_group";
  }

  if (
    context.neighboringRegionTerms.length > 0 &&
    matchesLocationTerms(locationValues, context.neighboringRegionTerms)
  ) {
    return "neighboring";
  }

  return "broad";
}

function compareScoredOpportunities<
  TOpportunity extends OpportunityRecommendationInput,
>(
  a: ScoredOpportunityRecommendation<TOpportunity>,
  b: ScoredOpportunityRecommendation<TOpportunity>
): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  if (a.positiveSignalCount !== b.positiveSignalCount) {
    return b.positiveSignalCount - a.positiveSignalCount;
  }

  if (a.locationPriority !== b.locationPriority) {
    return a.locationPriority - b.locationPriority;
  }

  const aDeadline = a.opportunity.deadline
    ? new Date(a.opportunity.deadline).getTime()
    : Number.POSITIVE_INFINITY;
  const bDeadline = b.opportunity.deadline
    ? new Date(b.opportunity.deadline).getTime()
    : Number.POSITIVE_INFINITY;

  if (aDeadline !== bDeadline) {
    return aDeadline - bDeadline;
  }

  return new Date(b.opportunity.created_at).getTime() - new Date(a.opportunity.created_at).getTime();
}

function buildOpportunityReasons(
  matchedKeywords: string[],
  eligibilityMatches: string[],
  locationScope: OpportunityLocationScope,
  context: RecommendationContext
): string[] {
  return [
    matchedKeywords.length > 0
      ? `Poklapa se s profilom: ${matchedKeywords.slice(0, 2).join(", ")}`
      : null,
    eligibilityMatches.length > 0
      ? `Uslovi i ko treba da aplicira odgovaraju vaÅ¡em profilu`
      : null,
    locationScope === "selected" && context.regionLabels.length > 0
      ? `Otvoreno za vaÅ¡u regiju: ${context.regionLabels.slice(0, 2).join(", ")}`
      : null,
    locationScope === "same_group"
      ? "Otvoreno za Å¡ire podruÄje vaÅ¡eg poslovanja"
      : null,
    locationScope === "neighboring"
      ? "Primjenjivo je u susjednim regijama vaÅ¡eg poslovanja"
      : null,
  ].filter((reason): reason is string => Boolean(reason)).slice(0, 3);
}

export function scoreOpportunityRecommendation<
  TOpportunity extends OpportunityRecommendationInput,
>(
  opportunity: TOpportunity,
  context: RecommendationContext
): ScoredOpportunityRecommendation<TOpportunity> {
  const title = normalizeText(opportunity.title);
  const category = normalizeText(
    [opportunity.category, opportunity.subcategory, opportunity.industry].filter(Boolean).join(" ")
  );
  const eligibility = normalizeText(
    [
      opportunity.ai_who_should_apply,
      opportunity.requirements,
      ...(opportunity.eligibility_signals ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );
  const text = normalizeText(
    [opportunity.ai_summary, opportunity.description, opportunity.issuer]
      .filter(Boolean)
      .join(" ")
  );

  const titleMatches = context.keywords.filter((keyword) => textMatchesKeyword(title, keyword));
  const categoryMatches = context.keywords.filter(
    (keyword) => !titleMatches.includes(keyword) && textMatchesKeyword(category, keyword)
  );
  const eligibilityMatches = context.keywords.filter(
    (keyword) =>
      !titleMatches.includes(keyword) &&
      !categoryMatches.includes(keyword) &&
      textMatchesKeyword(eligibility, keyword)
  );
  const textMatches = context.keywords.filter(
    (keyword) =>
      !titleMatches.includes(keyword) &&
      !categoryMatches.includes(keyword) &&
      !eligibilityMatches.includes(keyword) &&
      textMatchesKeyword(text, keyword)
  );
  const matchedKeywords = uniqueStrings([
    ...titleMatches,
    ...categoryMatches,
    ...eligibilityMatches,
    ...textMatches,
  ]);
  const multiWordMatches = matchedKeywords.filter((keyword) => keyword.includes(" "));
  const negativeMatches = uniqueStrings(
    context.negativeSignals.filter((signal) =>
      [title, category, eligibility, text].some((value) => value.includes(signal))
    )
  );
  const locationScope = getOpportunityLocationScope(opportunity, context);
  const locationPriority = getLocationPriority(locationScope);
  const hasLocationPreference = context.regionTerms.length > 0;

  let score = 0;
  score += titleMatches.length * 6;
  score += categoryMatches.length * 4;
  score += eligibilityMatches.length * 4;
  score += textMatches.length * 2;
  score += multiWordMatches.length * 2;
  score += locationScope === "selected" ? 4 : locationScope === "same_group" ? 2 : locationScope === "neighboring" ? 1 : 0;
  score -= negativeMatches.length * 4;

  const strongBusinessSignal =
    titleMatches.length > 0 ||
    categoryMatches.length > 0 ||
    eligibilityMatches.length > 0 ||
    multiWordMatches.length > 0 ||
    textMatches.length >= 2;
  const strongStructuredSignal =
    titleMatches.length > 0 ||
    categoryMatches.length > 0 ||
    eligibilityMatches.length > 0 ||
    multiWordMatches.length > 0;
  const broadLocationBlocked =
    hasLocationPreference && locationScope === "broad" && !strongBusinessSignal;
  const positiveSignalCount =
    titleMatches.length * 3 +
    categoryMatches.length * 2 +
    eligibilityMatches.length * 2 +
    textMatches.length +
    (locationScope === "selected" ? 2 : locationScope === "same_group" ? 1 : 0);
  const qualifies =
    !broadLocationBlocked &&
    negativeMatches.length < 3 &&
    (
      (strongBusinessSignal && score >= (strongStructuredSignal ? 6 : 8)) ||
      (locationScope !== "broad" &&
        score >= 6 &&
        matchedKeywords.length > 0)
    );

  return {
    opportunity,
    score,
    qualifies,
    titleMatches,
    categoryMatches,
    eligibilityMatches,
    textMatches,
    matchedKeywords,
    negativeMatches,
    locationScope,
    locationPriority,
    positiveSignalCount,
    reasons: buildOpportunityReasons(
      matchedKeywords,
      eligibilityMatches,
      locationScope,
      context
    ),
  };
}

export function selectOpportunityRecommendations<
  TOpportunity extends OpportunityRecommendationInput,
>(
  opportunities: TOpportunity[],
  context: RecommendationContext,
  limit?: number
): Array<ScoredOpportunityRecommendation<TOpportunity>> {
  const ranked = opportunities
    .map((opportunity) => scoreOpportunityRecommendation(opportunity, context))
    .filter((item) => item.qualifies)
    .sort(compareScoredOpportunities);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}

export async function fetchPublishedGrantCandidates<
  TOpportunity extends OpportunityRecommendationInput,
>(
  supabase: SupabaseClient<Database>,
  options: FetchPublishedGrantCandidatesOptions = {}
): Promise<TOpportunity[]> {
  const { data } = await supabase
    .from("opportunities")
    .select(
      options.select ??
        "id, slug, type, title, issuer, category, subcategory, industry, value, deadline, location, requirements, eligibility_signals, description, status, ai_summary, ai_who_should_apply, ai_difficulty, created_at"
    )
    .eq("published", true)
    .eq("type", "poticaj")
    .neq("status", "expired")
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (data ?? []) as TOpportunity[];
}

export async function getPersonalizedOpportunityRecommendations<
  TOpportunity extends OpportunityRecommendationInput,
>(
  supabase: SupabaseClient<Database>,
  options: PersonalizedOpportunityOptions
): Promise<PersonalizedOpportunityResult<TOpportunity>> {
  const context = buildOpportunityRecommendationContext(options.company);
  const excludeOpportunityIds = new Set(options.excludeOpportunityIds ?? []);
  const candidates = await fetchPublishedGrantCandidates<TOpportunity>(supabase, {
    select: options.select,
  });
  const availableCandidates =
    excludeOpportunityIds.size > 0
      ? candidates.filter((opportunity) => !excludeOpportunityIds.has(opportunity.id))
      : candidates;

  if (!hasOpportunityRecommendationSignals(context)) {
    return {
      context,
      personalized: [],
      others: availableCandidates,
    };
  }

  const personalized = selectOpportunityRecommendations(
    availableCandidates,
    context,
    options.limit
  );
  const personalizedIds = new Set(
    personalized.map((recommendation) => recommendation.opportunity.id)
  );
  const others = availableCandidates.filter(
    (opportunity) => !personalizedIds.has(opportunity.id)
  );

  return {
    context,
    personalized,
    others,
  };
}
