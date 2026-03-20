import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRecommendationKeywords,
  buildStrictRecommendationCpvCodes,
  buildStrictRecommendationKeywords,
  derivePrimaryIndustry,
  getPreferredContractTypes,
  parseCompanyProfile,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import { buildRegionSearchTerms, getRegionSelectionLabels } from "@/lib/constants/regions";
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
  keywords: string[];
  negativeSignals: string[];
  preferredContractTypes: string[];
  regionTerms: string[];
  regionLabels: string[];
  cpvPrefixes: string[];
}

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
  reasons: string[];
}

interface FetchRecommendedTenderCandidatesOptions {
  limit?: number;
  nowIso?: string;
  select?: string;
}

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
  medical: ["asfalt", "beton", "kanalizacij", "vodovod", "građevin"],
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
  medical_supplies: ["asfalt", "kanalizacij", "izgradnj", "server"],
  laboratory_diagnostics: ["asfalt", "beton", "kanalizacij", "vodovod"],
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
  // TODO: Re-enable after cpv_code column is added to tenders table via migration.
  // The column does not exist in production yet — referencing it in .or() breaks the entire query.
  void cpvPrefixes;
  return [];
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
      prefixes.add(normalized.slice(0, 8));
    }

    prefixes.add(normalized.slice(0, 5));
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

function buildKeywordReasons(matchedKeywords: string[]): string[] {
  if (matchedKeywords.length === 0) {
    return [];
  }

  return [`Poklapa se s pojmovima: ${matchedKeywords.slice(0, 2).join(", ")}`];
}

export function buildRecommendationContext(
  source: RecommendationCompanySource
): RecommendationContext {
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

  return {
    profile,
    focusIndustry,
    keywords:
      strictKeywords.length > 0
        ? strictKeywords
        : buildRecommendationKeywords({
            explicitKeywords: source.keywords ?? [],
            profile,
          }),
    negativeSignals: buildNegativeSignals(profile, focusIndustry),
    preferredContractTypes: getPreferredContractTypes(profile.preferredTenderTypes),
    regionTerms: buildRegionSearchTerms(source.operating_regions ?? []),
    regionLabels: getRegionSelectionLabels(source.operating_regions ?? []),
    cpvPrefixes: buildCpvPrefixes(
      strictCpvCodes.length > 0 ? strictCpvCodes : (source.cpv_codes ?? [])
    ),
  };
}

export function buildRecommendationSearchCondition(context: RecommendationContext): string {
  const keywordConditions = context.keywords.flatMap((term) => {
    const safeTerm = escapePostgrestLikeValue(term);

    if (!safeTerm) {
      return [];
    }

    return [`title.ilike.%${safeTerm}%`, `raw_description.ilike.%${safeTerm}%`];
  });

  return keywordConditions.join(",");
}

export function hasRecommendationSignals(context: RecommendationContext): boolean {
  return (
    context.keywords.length > 0 ||
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

  const queryConditions = [
    ...buildRecommendationSearchCondition(context)
      .split(",")
      .filter(Boolean),
    ...buildCpvSearchConditions(context.cpvPrefixes),
    ...(context.preferredContractTypes.length > 0 && context.preferredContractTypes.length < 3
      ? buildContractTypeSearchConditions(context.preferredContractTypes)
      : []),
  ];
  const nowIso = options.nowIso ?? new Date().toISOString();
  const limit = options.limit ?? 240;

  let query = supabase
    .from("tenders")
    .select(options.select ?? "*")
    .gt("deadline", nowIso);

  if (queryConditions.length > 0) {
    query = query.or(queryConditions.join(","));
  }

  const { data } = await query
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as TTender[];
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
  const authority = normalizeText(tender.contracting_authority);
  const authorityCity = normalizeText(tender.authority_city);
  const authorityMunicipality = normalizeText(tender.authority_municipality);
  const authorityCanton = normalizeText(tender.authority_canton);
  const authorityEntity = normalizeText(tender.authority_entity);
  const normalizedCpvCode = normalizeCpvCode(tender.cpv_code);

  const titleMatches = context.keywords.filter((keyword) => title.includes(keyword.toLowerCase()));
  const matchedKeywords = uniqueStrings([
    ...titleMatches,
    ...context.keywords.filter(
      (keyword) =>
        !titleMatches.includes(keyword) &&
        (description.includes(keyword.toLowerCase()) || authority.includes(keyword.toLowerCase()))
    ),
  ]);
  const multiWordMatches = matchedKeywords.filter((keyword) => keyword.includes(" "));
  const negativeTitleMatches = context.negativeSignals.filter((signal) => title.includes(signal));
  const negativeMatches = uniqueStrings([
    ...negativeTitleMatches,
    ...context.negativeSignals.filter(
      (signal) =>
        !negativeTitleMatches.includes(signal) &&
        (description.includes(signal) || authority.includes(signal))
    ),
  ]);
  const cpvMatch = context.cpvPrefixes.some(
    (prefix) => normalizedCpvCode?.startsWith(prefix) ?? false
  );
  const contractMatch = matchesPreferredContractTypes(
    tender.contract_type,
    context.preferredContractTypes
  );
  const regionMatch = matchesRegionTerms(
    [
      title,
      description,
      authority,
      authorityCity,
      authorityMunicipality,
      authorityCanton,
      authorityEntity,
    ],
    context.regionTerms
  );

  let score = 0;
  score += titleMatches.length * 5;
  score += matchedKeywords.length * 2;
  score += multiWordMatches.length * 2;

  if (cpvMatch) {
    score += 7;
  }

  if (context.preferredContractTypes.length > 0 && contractMatch) {
    score += 2;
  }

  if (regionMatch) {
    score += 1;
  }

  const negativePenalty =
    negativeTitleMatches.length * 6 +
    Math.max(negativeMatches.length - negativeTitleMatches.length, 0) * 3;

  score -= negativePenalty;

  const hasBusinessSignalInProfile = context.keywords.length > 0 || context.cpvPrefixes.length > 0;
  const hasPositiveSignal = cpvMatch || titleMatches.length > 0 || matchedKeywords.length >= 2;
  const fallbackTypeScopedMatch =
    !hasBusinessSignalInProfile &&
    context.preferredContractTypes.length > 0 &&
    contractMatch &&
    regionMatch;
  const blockedByNegativeTitle = negativeTitleMatches.length > 0 && !cpvMatch && titleMatches.length === 0;
  const qualifies =
    ((hasPositiveSignal && score >= (cpvMatch ? 2 : 4)) || fallbackTypeScopedMatch) &&
    contractMatch &&
    regionMatch &&
    !blockedByNegativeTitle;

  const reasons = [
    ...(cpvMatch ? ["Poklapa se s vašim CPV fokusom"] : []),
    ...buildKeywordReasons(matchedKeywords),
    ...(context.preferredContractTypes.length > 0 && contractMatch
      ? [`Odgovara tipu tendera: ${context.preferredContractTypes.join(", ")}`]
      : []),
    ...(regionMatch && context.regionLabels.length > 0
      ? [`Odgovara području rada: ${context.regionLabels.slice(0, 2).join(", ")}`]
      : []),
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
    reasons,
  };
}

export function rankTenderRecommendations<TTender extends RecommendationTenderInput>(
  tenders: TTender[],
  context: RecommendationContext,
  limit?: number
): Array<ScoredTenderRecommendation<TTender>> {
  const ranked = tenders
    .map((tender) => scoreTenderRecommendation(tender, context))
    .filter((item) => item.qualifies)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return (
        new Date(a.tender.deadline ?? 0).getTime() - new Date(b.tender.deadline ?? 0).getTime()
      );
    });

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
