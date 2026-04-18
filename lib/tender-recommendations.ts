import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildBroadRetrievalCpvPrefixes,
  buildEffectiveContractTypes,
  buildProfileCoreKeywordSeeds,
  buildProfileCpvSeeds,
  buildProfileKeywordAliases,
  buildRecommendationKeywords,
  buildStrictRecommendationCpvCodes,
  buildStrictRecommendationKeywords,
  derivePrimaryIndustry,
  parseCompanyProfile,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import {
  buildRegionSearchTerms,
  buildSameGroupRegionFallback,
  buildNeighboringGroupRegionFallback,
  getRegionSelectionLabels,
} from "@/lib/constants/regions";
import {
  getCoordsForPlace,
  getAnchorCoords,
  haversineKm,
  distanceToLocationPriority,
} from "@/lib/constants/municipality-coordinates";
import { getGeoEnrichmentFromAiAnalysis } from "@/lib/tender-area";
import type { Database, Json } from "@/types/database";

export interface RecommendationCompanySource {
  industry: string | null | undefined;
  keywords?: string[] | null;
  cpv_codes?: string[] | null;
  operating_regions?: string[] | null;
}

export interface RecommendationContext {
  profile: ParsedCompanyProfile;
  focusIndustry: string | null;
  coreKeywords: string[];
  keywords: string[];
  retrievalKeywords: string[];
  negativeSignals: string[];
  preferredContractTypes: string[];
  regionTerms: string[];
  sameGroupRegionTerms: string[];
  neighboringRegionTerms: string[];
  regionLabels: string[];
  cpvPrefixes: string[];
  /** 2-digit CPV prefixes for broad retrieval (fetched with higher limit) */
  broadCpvPrefixes: string[];
  /** Geographic anchor point (average of selected regions). Null if no regions selected. */
  anchorLat: number | null;
  anchorLng: number | null;
}

export type RecommendationLocationScope = "selected" | "same_group" | "neighboring" | "broad";

export interface RecommendationTenderInput {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  contracting_authority_jib?: string | null;
  contract_type?: string | null;
  raw_description?: string | null;
  cpv_code?: string | null;
  ai_analysis?: Json | null;
  authority_city?: string | null;
  authority_municipality?: string | null;
  authority_canton?: string | null;
  authority_entity?: string | null;
}

export interface ScoredTenderRecommendation<TTender extends RecommendationTenderInput> {
  tender: TTender;
  score: number;
  qualifies: boolean;
  matchedKeywords: string[];
  titleMatches: string[];
  negativeMatches: string[];
  negativeTitleMatches: string[];
  negativePenalty: number;
  cpvMatch: boolean;
  contractMatch: boolean;
  regionMatch: boolean;
  sameGroupRegionMatch: boolean;
  neighboringRegionMatch: boolean;
  locationScope: RecommendationLocationScope;
  locationPriority: number;
  positiveSignalCount: number;
  fallbackEligible: boolean;
  reasons: string[];
}

interface RecommendationSelectionOptions {
  limit?: number;
  minimumResults?: number;
}

interface FetchRecommendedTenderCandidatesOptions {
  limit?: number;
  nowIso?: string;
  select?: string;
  includeUndated?: boolean;
}

export const RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT = 3000;
export const RECOMMENDATION_SUMMARY_CANDIDATE_LIMIT = 800;
export const RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS = 36;
export const RECOMMENDATION_SUMMARY_MINIMUM_RESULTS = 12;

const PRIMARY_INDUSTRY_NEGATIVE_KEYWORDS: Record<string, string[]> = {
  construction: [
    "softver",
    "licenc",
    "server",
    "računar",
    "mrežna oprema",
    "antivirus",
    "cloud",
    "cyber sigurnost",
    "data centar",
  ],
  it: [
    "armaturna mreža",
    "armatura",
    "beton",
    "asfalt",
    "kanalizacij",
    "vodovod",
    "fasad",
    "krov",
    "stolarij",
    "iskop",
    "saobraćajnic",
    "trotoar",
  ],
  equipment: [
    "izgradnj",
    "rekonstrukcij",
    "asfalt",
    "kanalizacij",
    "softverska podrška",
    "razvoj aplikacije",
  ],
  medical: [
    "asfalt", "beton", "kanalizacij", "vodovod", "građevin",
    "goriv", "lož ulj", "pelet",
    "čišćenj objekat", "generalno čišćenj",
    "catering", "priprema obrok", "prehramben",
    "kancelarijski namještaj", "školski namještaj",
    "servis vozil", "autodijelov",
    "zimsk održavanj", "odvoz otpad",
    "štamp", "promotivn materijal",
    "softver", "licenc", "server", "računar",
  ],
  maintenance: ["izgradnj", "rekonstrukcij", "novogradnj", "softver", "razvoj aplikacije"],
  consulting: ["armaturna mreža", "beton", "asfalt", "server", "računar"],
  logistics: ["softver", "licenc", "server", "cyber sigurnost", "projektovanje"],
  security_energy: ["kancelarijski namještaj", "prehramben", "catering", "školski namještaj"],
  facilities_hospitality: ["server", "softver", "firewall", "građevin", "asfalt"],
  communications_media: ["armatura", "beton", "kanalizacij", "server rack", "mrežna oprema"],
};

const OFFERING_CATEGORY_NEGATIVE_KEYWORDS: Record<string, string[]> = {
  software_licenses: ["armatura", "beton", "asfalt", "kanalizacij", "vodovod"],
  it_hardware: ["armaturna mreža", "armatura", "beton", "asfalt", "krov", "fasad"],
  telecom_av: ["beton", "armatura", "kanalizacij", "vodovod"],
  cloud_cyber_data: ["armatura", "beton", "asfalt", "kanalizacij", "vodovod"],
  construction_works: ["softver", "licenc", "server", "antivirus", "cloud"],
  electro_mechanical: ["softver", "licenc", "cyber sigurnost", "saas"],
  design_supervision: ["server", "računar", "antivirus", "mrežna oprema"],
  maintenance_support: ["novogradnj", "izgradnj autoputa", "grubi građevinski radovi"],
  office_school_equipment: ["asfalt", "kanalizacij", "izgradnj", "razvoj softvera"],
  medical_supplies: [
    "asfalt", "kanalizacij", "izgradnj", "server",
    "goriv", "lož ulj", "čišćenj objekat",
    "catering", "priprema obrok", "prehramben",
    "kancelarijski namještaj", "školski namještaj",
    "servis vozil", "autodijelov",
    "softver", "licenc",
  ],
  laboratory_diagnostics: [
    "asfalt", "beton", "kanalizacij", "vodovod",
    "goriv", "čišćenj objekat", "catering",
    "prehramben", "namještaj",
    "servis vozil", "autodijelov",
    "softver", "licenc",
  ],
  security_video: ["prehramben", "catering", "asfalt", "namještaj"],
};

function normalizeText(value: string | null | undefined): string {
  return value?.toLowerCase() ?? "";
}

function normalizeContractType(value: string | null | undefined): string | null {
  const normalized = normalizeText(value).trim();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("rob") || normalized.includes("good")) {
    return "Robe";
  }

  if (normalized.includes("uslug") || normalized.includes("service")) {
    return "Usluge";
  }

  if (normalized.includes("radov") || normalized.includes("work")) {
    return "Radovi";
  }

  return value?.trim() ?? null;
}

function buildContractTypeSearchConditions(preferredContractTypes: string[]): string[] {
  const canonicalTypes = [...new Set(
    preferredContractTypes
      .map((item) => normalizeContractType(item))
      .filter(Boolean) as string[]
  )];

  return canonicalTypes.flatMap((contractType) => {
    if (contractType === "Robe") {
      return ["contract_type.ilike.%rob%", "contract_type.ilike.%good%"];
    }

    if (contractType === "Usluge") {
      return ["contract_type.ilike.%uslug%", "contract_type.ilike.%service%"];
    }

    if (contractType === "Radovi") {
      return ["contract_type.ilike.%radov%", "contract_type.ilike.%work%"];
    }

    const safeValue = escapePostgrestLikeValue(contractType);
    return safeValue ? [`contract_type.ilike.%${safeValue}%`] : [];
  });
}

function buildCpvSearchConditions(cpvPrefixes: string[]): string[] {
  if (cpvPrefixes.length === 0) {
    return [];
  }

  return cpvPrefixes.map((prefix) => `cpv_code.ilike.${prefix}%`);
}

function normalizeCpvCode(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9]/g, "");
  return normalized.length >= 5 ? normalized : null;
}

export function matchesCpvPrefixes(
  value: string | null | undefined,
  cpvPrefixes: string[]
): boolean {
  if (cpvPrefixes.length === 0) {
    return false;
  }

  const normalizedCpvCode = normalizeCpvCode(value);
  return cpvPrefixes.some((prefix) => normalizedCpvCode?.startsWith(prefix) ?? false);
}

export function matchesPreferredContractTypes(
  contractType: string | null | undefined,
  preferredContractTypes: string[]
): boolean {
  if (preferredContractTypes.length === 0) {
    return true;
  }

  const normalizedContractType = normalizeContractType(contractType);

  if (!normalizedContractType) {
    return false;
  }

  return preferredContractTypes.some(
    (preferredType) => normalizeContractType(preferredType) === normalizedContractType
  );
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

function normalizeSignalTerm(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized.length < 4) {
    return null;
  }

  return normalized;
}

function normalizeRecommendationKeyword(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized.length < 3) {
    return null;
  }

  return normalized;
}

function foldRecommendationKeyword(value: string): string {
  return value
    .normalize("NFD")
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj");
}

function normalizeRecommendationMatchText(value: string | null | undefined): string {
  const normalized = normalizeText(value)
    .replace(/[(),.;:/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return foldRecommendationKeyword(normalized).toLowerCase();
}

function keywordMatchesRecommendationText(
  keyword: string,
  primaryText: string,
  foldedText: string
): boolean {
  const normalizedKeyword = normalizeRecommendationKeyword(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  if (primaryText.includes(normalizedKeyword)) {
    return true;
  }

  const foldedKeyword = normalizeRecommendationKeyword(
    foldRecommendationKeyword(normalizedKeyword)
  );

  return foldedKeyword ? foldedText.includes(foldedKeyword) : false;
}

function buildKeywordVariantSet(terms: Array<string | null | undefined>): string[] {
  const variants = new Set<string>();

  for (const term of terms) {
    const normalized = normalizeRecommendationKeyword(term);

    if (!normalized) {
      continue;
    }

    variants.add(normalized);

    const folded = normalizeRecommendationKeyword(foldRecommendationKeyword(normalized));
    if (folded) {
      variants.add(folded);
    }
  }

  return [...variants];
}

function buildNegativeSignals(profile: ParsedCompanyProfile, focusIndustry: string | null): string[] {
  return uniqueStrings(
    [
      ...(focusIndustry ? PRIMARY_INDUSTRY_NEGATIVE_KEYWORDS[focusIndustry] ?? [] : []),
      ...profile.offeringCategories.flatMap(
        (categoryId) => OFFERING_CATEGORY_NEGATIVE_KEYWORDS[categoryId] ?? []
      ),
    ].map((term) => normalizeSignalTerm(term))
  );
}

function buildCpvPrefixes(cpvCodes: Array<string | null | undefined>): string[] {
  const prefixes = new Set<string>();

  for (const cpvCode of cpvCodes) {
    const normalized = normalizeCpvCode(cpvCode);

    if (!normalized) {
      continue;
    }

    if (normalized.length >= 8) {
      const primaryCode = normalized.slice(0, 8);
      prefixes.add(primaryCode);

      const hierarchicalPrefix = primaryCode.replace(/0+$/g, "");
      if (hierarchicalPrefix.length >= 2) {
        prefixes.add(hierarchicalPrefix);
      }
    }

    if (normalized.length >= 5) {
      prefixes.add(normalized.slice(0, 5));
    }
  }

  return [...prefixes];
}

function escapePostgrestLikeValue(value: string): string {
  return value.replace(/,/g, " ").trim();
}

function matchesRegionTerms(
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

function getTenderLocationValues<TTender extends RecommendationTenderInput>(
  tender: TTender
): Array<string | null | undefined> {
  const geoEnrichment = getGeoEnrichmentFromAiAnalysis(tender.ai_analysis ?? null);

  return [
    tender.title,
    tender.raw_description,
    tender.contracting_authority,
    geoEnrichment?.area_label ?? null,
    tender.authority_city,
    tender.authority_municipality,
    tender.authority_canton,
    tender.authority_entity,
  ];
}

export function matchesTenderLocationTerms<TTender extends RecommendationTenderInput>(
  tender: TTender,
  regionTerms: string[]
): boolean {
  return matchesRegionTerms(getTenderLocationValues(tender), regionTerms);
}

export function getTenderLocationScope<TTender extends RecommendationTenderInput>(
  tender: TTender,
  context: Pick<RecommendationContext, "regionTerms" | "sameGroupRegionTerms" | "neighboringRegionTerms" | "anchorLat" | "anchorLng">
): RecommendationLocationScope {
  // If we have an anchor point, use distance-based scope
  if (context.anchorLat !== null && context.anchorLng !== null) {
    const priority = getTenderLocationPriorityByDistance(tender, context.anchorLat, context.anchorLng);
    if (priority === 0) return "selected";
    if (priority === 1) return "same_group";
    if (priority === 2) return "neighboring";
    return "broad";
  }

  // Fallback: text-based matching
  if (context.regionTerms.length > 0 && matchesTenderLocationTerms(tender, context.regionTerms)) {
    return "selected";
  }
  if (context.sameGroupRegionTerms.length > 0 && matchesTenderLocationTerms(tender, context.sameGroupRegionTerms)) {
    return "same_group";
  }
  if (context.neighboringRegionTerms.length > 0 && matchesTenderLocationTerms(tender, context.neighboringRegionTerms)) {
    return "neighboring";
  }
  return "broad";
}

/**
 * Compute location priority for a tender using haversine distance from anchor.
 * Tries authority_municipality → authority_city → authority_canton in order.
 */
function getTenderLocationPriorityByDistance<TTender extends RecommendationTenderInput>(
  tender: TTender,
  anchorLat: number,
  anchorLng: number
): number {
  const candidates = [
    tender.authority_municipality,
    tender.authority_city,
    tender.authority_canton,
  ];
  for (const place of candidates) {
    const coords = getCoordsForPlace(place);
    if (coords) {
      const km = haversineKm(anchorLat, anchorLng, coords.lat, coords.lng);
      return distanceToLocationPriority(km);
    }
  }
  // No coords found — fallback to text match
  return 3;
}

function getLocationPriority(scope: RecommendationLocationScope): number {
  switch (scope) {
    case "selected": return 0;
    case "same_group": return 1;
    case "neighboring": return 2;
    default: return 3;
  }
}

function getRecommendationDeadlineSortValue(deadline: string | null): number {
  if (!deadline) {
    return Number.POSITIVE_INFINITY;
  }

  return new Date(deadline).getTime();
}

function compareScoredRecommendations<TTender extends RecommendationTenderInput>(
  a: ScoredTenderRecommendation<TTender>,
  b: ScoredTenderRecommendation<TTender>
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

  return (
    getRecommendationDeadlineSortValue(a.tender.deadline) -
    getRecommendationDeadlineSortValue(b.tender.deadline)
  );
}

function dedupeScoredRecommendations<TTender extends RecommendationTenderInput>(
  items: Array<ScoredTenderRecommendation<TTender>>
): Array<ScoredTenderRecommendation<TTender>> {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.tender.id)) {
      return false;
    }

    seen.add(item.tender.id);
    return true;
  });
}

export function selectTenderRecommendations<TTender extends RecommendationTenderInput>(
  tenders: TTender[],
  context: RecommendationContext,
  options: RecommendationSelectionOptions = {}
): Array<ScoredTenderRecommendation<TTender>> {
  const scored = tenders.map((tender) => scoreTenderRecommendation(tender, context));
  const strict = scored.filter((item) => item.qualifies).sort(compareScoredRecommendations);
  const minimumResults = options.minimumResults ?? 0;

  let selected = [...strict];

  if (minimumResults > 0 && strict.length < minimumResults) {
    const fallback = scored
      .filter((item) => !item.qualifies && item.fallbackEligible)
      .sort(compareScoredRecommendations);

    selected = dedupeScoredRecommendations([...strict, ...fallback]);
  }

  if (typeof options.limit === "number") {
    return selected.slice(0, options.limit);
  }

  return selected;
}

function buildKeywordReasons(matchedKeywords: string[]): string[] {
  if (matchedKeywords.length === 0) {
    return [];
  }

  return [`Poklapa se s pojmovima: ${matchedKeywords.slice(0, 2).join(", ")}`];
}

export function buildRecommendationContext(
  source: RecommendationCompanySource
): RecommendationContext {
  const selectedRegions = source.operating_regions ?? [];
  const profile = parseCompanyProfile(source.industry);
  const focusIndustry = derivePrimaryIndustry(
    profile.offeringCategories,
    profile.primaryIndustry
  );
  const strictKeywords = buildStrictRecommendationKeywords({
    explicitKeywords: source.keywords ?? [],
    profile,
  });
  const strictCpvCodes = buildStrictRecommendationCpvCodes({
    explicitCpvCodes: source.cpv_codes ?? [],
    profile,
  });
  const broadKeywords = buildRecommendationKeywords({
    explicitKeywords: source.keywords ?? [],
    profile,
  });
  const aliasKeywords = buildProfileKeywordAliases(profile);

  // AI enrichment data (primary source when available)
  const aiCoreKw = profile.aiCoreKeywords ?? [];
  const aiBroadKw = profile.aiBroadKeywords ?? [];
  const aiCpv = profile.aiCpvCodes ?? [];
  const aiNegKw = profile.aiNegativeKeywords ?? [];

  const coreKeywords = [...new Set([
    ...aiCoreKw,
    ...buildProfileCoreKeywordSeeds(profile),
    ...strictKeywords,
  ])].slice(0, 36);
  const scoringKeywords = [...new Set([
    ...coreKeywords,
    ...aiBroadKw,
    ...strictKeywords,
    ...broadKeywords,
  ])].slice(0, 36);
  const retrievalKeywords = buildKeywordVariantSet([
    ...coreKeywords,
    ...scoringKeywords,
    ...aliasKeywords,
    ...aiCoreKw.slice(0, 8),
  ]).slice(0, 32);
  const profileCpvCodes = buildProfileCpvSeeds(profile);

  const hardcodedNegatives = buildNegativeSignals(profile, focusIndustry);
  const aiNegativeNormalized = aiNegKw
    .map((term) => normalizeSignalTerm(term))
    .filter((term): term is string => Boolean(term));

  const anchor = getAnchorCoords(selectedRegions);

  // AI CPV codes produce additional broad 2-digit prefixes for retrieval
  const aiCpvBroadPrefixes = [...new Set(
    aiCpv
      .map((code) => code.replace(/[^0-9]/g, "").slice(0, 2))
      .filter((p) => p.length === 2)
  )];
  const hardcodedBroadPrefixes = buildBroadRetrievalCpvPrefixes(profile);

  return {
    profile,
    focusIndustry,
    coreKeywords,
    keywords: scoringKeywords,
    retrievalKeywords,
    negativeSignals: [...new Set([...hardcodedNegatives, ...aiNegativeNormalized])],
    preferredContractTypes: buildEffectiveContractTypes(profile),
    regionTerms: buildRegionSearchTerms(selectedRegions),
    sameGroupRegionTerms: buildRegionSearchTerms(
      buildSameGroupRegionFallback(selectedRegions)
    ),
    neighboringRegionTerms: buildRegionSearchTerms(
      buildNeighboringGroupRegionFallback(selectedRegions)
    ),
    regionLabels: getRegionSelectionLabels(selectedRegions),
    cpvPrefixes: buildCpvPrefixes([
      ...aiCpv,
      ...strictCpvCodes,
      ...(source.cpv_codes ?? []),
      ...profileCpvCodes,
    ]),
    broadCpvPrefixes: [...new Set([...hardcodedBroadPrefixes, ...aiCpvBroadPrefixes])],
    anchorLat: anchor?.lat ?? null,
    anchorLng: anchor?.lng ?? null,
  };
}

export function buildRecommendationSearchCondition(context: RecommendationContext): string {
  const keywordConditions = context.retrievalKeywords.flatMap((term) => {
    const safeTerm = escapePostgrestLikeValue(term);

    if (!safeTerm) {
      return [];
    }

    return [
      `title.ilike.%${safeTerm}%`,
      `raw_description.ilike.%${safeTerm}%`,
    ];
  });

  return keywordConditions.join(",");
}

export function hasRecommendationSignals(context: RecommendationContext): boolean {
  return (
    context.retrievalKeywords.length > 0 ||
    context.cpvPrefixes.length > 0 ||
    context.preferredContractTypes.length > 0 ||
    context.regionTerms.length > 0
  );
}

export async function fetchRecommendedTenderCandidates<
  TTender extends RecommendationTenderInput,
>(
  supabase: SupabaseClient<Database>,
  context: RecommendationContext,
  options: FetchRecommendedTenderCandidatesOptions = {}
): Promise<TTender[]> {
  if (!hasRecommendationSignals(context)) {
    return [];
  }

  const nowIso = options.nowIso ?? new Date().toISOString();
  const limit = options.limit ?? RECOMMENDATION_SUMMARY_CANDIDATE_LIMIT;
  const select = options.select ?? "*";
  const includeUndated = options.includeUndated !== false;
  const keywordConditions = buildRecommendationSearchCondition(context)
    .split(",")
    .filter(Boolean);
  const cpvConditions = buildCpvSearchConditions(context.cpvPrefixes);
  const contractConditions =
    context.preferredContractTypes.length > 0 && context.preferredContractTypes.length < 3
      ? buildContractTypeSearchConditions(context.preferredContractTypes)
      : [];
  const conditionGroups = [keywordConditions, cpvConditions, contractConditions].filter(
    (conditions) => conditions.length > 0
  );

  const dedupeCandidateRows = (rows: TTender[]): TTender[] => {
    const deduped = new Map<string, TTender>();

    for (const row of rows) {
      if (!deduped.has(row.id)) {
        deduped.set(row.id, row);
      }
    }

    return [...deduped.values()].sort(
      (first, second) =>
        getRecommendationDeadlineSortValue(first.deadline) -
        getRecommendationDeadlineSortValue(second.deadline)
    );
  };

  const runCandidateQuery = async (
    conditions: string[],
    queryLimit: number
  ): Promise<TTender[]> => {
    let futureQuery = supabase
      .from("tenders")
      .select(select)
      .gt("deadline", nowIso);

    if (conditions.length > 0) {
      futureQuery = futureQuery.or(conditions.join(","));
    }

    const futurePromise = futureQuery
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(queryLimit);

    const undatedPromise = includeUndated
      ? (() => {
          let undatedQuery = supabase
            .from("tenders")
            .select(select)
            .is("deadline", null);

          if (conditions.length > 0) {
            undatedQuery = undatedQuery.or(conditions.join(","));
          }

          return undatedQuery
            .order("created_at", { ascending: false })
            .limit(Math.max(12, Math.min(Math.ceil(queryLimit / 3), queryLimit)));
        })()
      : Promise.resolve({ data: [] as TTender[] | null });

    const [{ data: futureRows }, { data: undatedRows }] = await Promise.all([
      futurePromise,
      undatedPromise,
    ]);

    return dedupeCandidateRows([
      ...(((futureRows ?? []) as unknown as TTender[])),
      ...(((undatedRows ?? []) as unknown as TTender[])),
    ]);
  };

  // CPV-primary retrieval: broad CPV prefixes get 3x limit for maximum recall
  const broadCpvConditions = context.broadCpvPrefixes.length > 0
    ? context.broadCpvPrefixes.map((prefix) => `cpv_code.ilike.${prefix}%`)
    : [];

  let combinedRows: TTender[];

  if (broadCpvConditions.length > 0) {
    const cpvLimit = Math.min(limit * 3, 6000);
    const supplementalGroups = [keywordConditions, contractConditions].filter(
      (conditions) => conditions.length > 0
    );

    const [cpvRows, ...supplementalResults] = await Promise.all([
      runCandidateQuery(broadCpvConditions, cpvLimit),
      ...supplementalGroups.map((conditions) => runCandidateQuery(conditions, limit)),
    ]);

    combinedRows = dedupeCandidateRows([cpvRows, ...supplementalResults].flat());
  } else {
    const resultGroups = conditionGroups.length > 0
      ? await Promise.all(conditionGroups.map((conditions) => runCandidateQuery(conditions, limit)))
      : [await runCandidateQuery([], limit)];

    combinedRows = dedupeCandidateRows(resultGroups.flat());
  }

  const fallbackThreshold = Math.max(18, Math.min(limit, Math.floor(limit / 3)));
  const hasConditions = broadCpvConditions.length > 0 || conditionGroups.length > 0;

  if (hasConditions && combinedRows.length < fallbackThreshold) {
    const fallbackRows = await runCandidateQuery(
      [],
      Math.min(Math.max(fallbackThreshold * 2, 120), limit)
    );
    combinedRows = dedupeCandidateRows([...combinedRows, ...fallbackRows]);
  }

  return enrichTendersWithAuthorityGeo(supabase, combinedRows);
}

export async function enrichTendersWithAuthorityGeo<
  TTender extends RecommendationTenderInput,
>(
  supabase: SupabaseClient<Database>,
  rows: TTender[]
): Promise<TTender[]> {
  const authorityJibs = [
    ...new Set(
      rows
        .map((tender) => tender.contracting_authority_jib)
        .filter(Boolean) as string[]
    ),
  ];

  const { data: authorityRows } = authorityJibs.length > 0
    ? await supabase
        .from("contracting_authorities")
        .select("jib, city, municipality, canton, entity")
        .in("jib", authorityJibs)
    : { data: [] };

  const authorityMap = new Map(
    (authorityRows ?? []).map((authority) => [authority.jib, authority])
  );

  return rows.map((tender) => {
    const authority = tender.contracting_authority_jib
      ? authorityMap.get(tender.contracting_authority_jib)
      : null;
    const geoEnrichment = getGeoEnrichmentFromAiAnalysis(tender.ai_analysis ?? null);

    return {
      ...tender,
      authority_city: authority?.city ?? null,
      authority_municipality: geoEnrichment?.municipality ?? authority?.municipality ?? null,
      authority_canton: geoEnrichment?.canton ?? authority?.canton ?? null,
      authority_entity: geoEnrichment?.entity ?? authority?.entity ?? null,
    } as TTender;
  });
}

export function scoreTenderRecommendation<TTender extends RecommendationTenderInput>(
  tender: TTender,
  context: RecommendationContext
): ScoredTenderRecommendation<TTender> {
  const title = normalizeText(tender.title);
  const description = normalizeText(tender.raw_description);
  const foldedTitle = normalizeRecommendationMatchText(tender.title);
  const foldedDescription = normalizeRecommendationMatchText(tender.raw_description);
  const normalizedCpvCode = normalizeCpvCode(tender.cpv_code);

  const coreTitleMatches = context.coreKeywords.filter((keyword) =>
    keywordMatchesRecommendationText(keyword, title, foldedTitle)
  );
  const coreDescriptionMatches = context.coreKeywords.filter(
    (keyword) =>
      !coreTitleMatches.includes(keyword) &&
      keywordMatchesRecommendationText(keyword, description, foldedDescription)
  );
  const titleMatches = context.keywords.filter((keyword) =>
    keywordMatchesRecommendationText(keyword, title, foldedTitle)
  );
  const descriptionMatches = context.keywords.filter(
    (keyword) =>
      !titleMatches.includes(keyword) &&
      keywordMatchesRecommendationText(keyword, description, foldedDescription)
  );
  const matchedKeywords = uniqueStrings([
    ...coreTitleMatches,
    ...coreDescriptionMatches,
    ...titleMatches,
    ...descriptionMatches,
  ]);
  const multiWordMatches = matchedKeywords.filter((keyword) => keyword.includes(" "));
  const negativeTitleMatches = context.negativeSignals.filter((signal) =>
    keywordMatchesRecommendationText(signal, title, foldedTitle)
  );
  const negativeMatches = uniqueStrings([
    ...negativeTitleMatches,
    ...context.negativeSignals.filter(
      (signal) =>
        !negativeTitleMatches.includes(signal) &&
        keywordMatchesRecommendationText(signal, description, foldedDescription)
    ),
  ]);
  const cpvMatch = context.cpvPrefixes.some(
    (prefix) => normalizedCpvCode?.startsWith(prefix) ?? false
  );
  const contractMatch = matchesPreferredContractTypes(
    tender.contract_type,
    context.preferredContractTypes
  );
  const locationScope = getTenderLocationScope(tender, context);
  const regionMatch = locationScope === "selected";
  const sameGroupRegionMatch = locationScope === "same_group";
  const neighboringRegionMatch = locationScope === "neighboring";
  const hasLocationPreference = context.anchorLat !== null || context.regionTerms.length > 0;

  // locationPriority: actual km distance if anchor available, else tier (0-3)
  // Used only for sort order, never in score
  let locationPriority: number;
  if (context.anchorLat !== null && context.anchorLng !== null) {
    const candidates = [
      tender.authority_municipality,
      tender.authority_city,
      tender.authority_canton,
      // Also try extracting city name from contracting_authority string
      tender.contracting_authority,
    ];
    let distKm: number | null = null;
    for (const place of candidates) {
      if (!place) continue;
      // Try direct lookup first
      let coords = getCoordsForPlace(place);
      // If not found, try to extract a known municipality name from the string
      if (!coords) {
        const words = place.split(/[\s,\-–]+/);
        for (const word of words) {
          if (word.length >= 4) {
            coords = getCoordsForPlace(word);
            if (coords) break;
          }
        }
      }
      if (coords) {
        distKm = haversineKm(context.anchorLat, context.anchorLng, coords.lat, coords.lng);
        break;
      }
    }
    // Use actual km as priority (lower = closer = better)
    // Unknown location gets 9999 so it sorts last
    locationPriority = distKm ?? 9999;
  } else {
    locationPriority = getLocationPriority(locationScope);
  }

  let score = 0;
  score += coreTitleMatches.length * 8;
  score += coreDescriptionMatches.length * 5;
  score += titleMatches.length * 4;
  score += descriptionMatches.length * 2;
  score += multiWordMatches.length * 2;

  if (cpvMatch) {
    score += 8;
  }

  if (context.preferredContractTypes.length > 0 && contractMatch) {
    score += 3;
  }

  // No location bonus in score — location only affects sort order via locationPriority

  const negativePenalty =
    negativeTitleMatches.length * 6 +
    Math.max(negativeMatches.length - negativeTitleMatches.length, 0) * 3;

  score -= negativePenalty;

  const hasBusinessSignalInProfile =
    context.coreKeywords.length > 0 ||
    context.keywords.length > 0 ||
    context.cpvPrefixes.length > 0;
  const hasCoreSignal = coreTitleMatches.length > 0 || coreDescriptionMatches.length > 0;
  const hasBroadSignal =
    titleMatches.length > 0 ||
    multiWordMatches.length > 0 ||
    matchedKeywords.length >= 3;
  const hasPositiveSignal = cpvMatch || hasCoreSignal || hasBroadSignal;
  const positiveSignalCount =
    (cpvMatch ? 4 : 0) +
    coreTitleMatches.length * 3 +
    coreDescriptionMatches.length * 2 +
    titleMatches.length * 2 +
    matchedKeywords.length +
    (contractMatch ? 1 : 0) +
    (regionMatch ? 2 : sameGroupRegionMatch ? 1 : neighboringRegionMatch ? 1 : 0);
  const fallbackTypeScopedMatch =
    !hasBusinessSignalInProfile &&
    context.preferredContractTypes.length > 0 &&
    contractMatch &&
    (!hasLocationPreference || locationScope !== "broad");
  const blockedByNegativeTitle =
    negativeTitleMatches.length > 0 &&
    !cpvMatch &&
    coreTitleMatches.length === 0 &&
    titleMatches.length === 0;
  const strongBusinessSignal =
    cpvMatch ||
    hasCoreSignal ||
    titleMatches.length > 0 ||
    multiWordMatches.length > 0 ||
    matchedKeywords.length >= 3;
  const broadLocationBlocked =
    hasLocationPreference && locationScope === "broad" && !strongBusinessSignal;
  const fallbackEligible =
    !blockedByNegativeTitle &&
    (contractMatch || cpvMatch) &&
    !broadLocationBlocked &&
    score >= 3 &&
    (cpvMatch || hasCoreSignal || titleMatches.length > 0 || matchedKeywords.length >= 2);
  const supportOnlyQualified =
    !hasCoreSignal &&
    !cpvMatch &&
    contractMatch &&
    titleMatches.length > 0 &&
    matchedKeywords.length >= 2 &&
    score >= 6;
  const qualifies =
    ((hasPositiveSignal &&
      (cpvMatch ||
        coreTitleMatches.length > 0 ||
        (hasCoreSignal && score >= 5) ||
        supportOnlyQualified) &&
      score >= (cpvMatch ? 2 : 4)) ||
      fallbackTypeScopedMatch) &&
    (contractMatch || (cpvMatch && score >= 4)) &&
    !broadLocationBlocked &&
    !blockedByNegativeTitle;

  const reasons = [
    ...(cpvMatch ? ["Poklapa se s vašim CPV fokusom"] : []),
    ...buildKeywordReasons(matchedKeywords),
    ...(context.preferredContractTypes.length > 0 && contractMatch
      ? [`Odgovara tipu tendera: ${context.preferredContractTypes.join(", ")}`]
      : []),
    ...(regionMatch && context.regionLabels.length > 0
      ? [`Blizu lokacije firme: ${context.regionLabels.slice(0, 2).join(", ")}`]
      : []),
    ...(sameGroupRegionMatch ? ["Blizu lokacije firme i poslovnica"] : []),
    ...(neighboringRegionMatch ? ["U širem području firme"] : []),
  ].slice(0, 3);

  return {
    tender,
    score,
    qualifies,
    matchedKeywords,
    titleMatches,
    negativeMatches,
    negativeTitleMatches,
    negativePenalty,
    cpvMatch,
    contractMatch,
    regionMatch,
    sameGroupRegionMatch,
    neighboringRegionMatch,
    locationScope,
    locationPriority,
    positiveSignalCount,
    fallbackEligible,
    reasons,
  };
}

export function rankTenderRecommendations<TTender extends RecommendationTenderInput>(
  tenders: TTender[],
  context: RecommendationContext,
  limit?: number
): Array<ScoredTenderRecommendation<TTender>> {
  const ranked = selectTenderRecommendations(tenders, context);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
