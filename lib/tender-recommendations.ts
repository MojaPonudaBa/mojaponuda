import {
  buildRecommendationKeywords,
  derivePrimaryIndustry,
  getPreferredContractTypes,
  parseCompanyProfile,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import { buildRegionSearchTerms, getRegionSelectionLabels } from "@/lib/constants/regions";

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

function normalizeCpvCode(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9]/g, "");
  return normalized.length >= 5 ? normalized : null;
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

  return {
    profile,
    focusIndustry,
    keywords: buildRecommendationKeywords({
      explicitKeywords: source.keywords ?? [],
      profile,
    }),
    negativeSignals: buildNegativeSignals(profile, focusIndustry),
    preferredContractTypes: getPreferredContractTypes(profile.preferredTenderTypes),
    regionTerms: buildRegionSearchTerms(source.operating_regions ?? []),
    regionLabels: getRegionSelectionLabels(source.operating_regions ?? []),
    cpvPrefixes: buildCpvPrefixes(source.cpv_codes ?? []),
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
  const contractMatch =
    context.preferredContractTypes.length === 0 ||
    (tender.contract_type ? context.preferredContractTypes.includes(tender.contract_type) : false);
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

  const hasPositiveSignal = cpvMatch || titleMatches.length > 0 || matchedKeywords.length >= 2;
  const blockedByNegativeTitle = negativeTitleMatches.length > 0 && !cpvMatch && titleMatches.length === 0;
  const qualifies =
    hasPositiveSignal &&
    contractMatch &&
    regionMatch &&
    !blockedByNegativeTitle &&
    score >= (cpvMatch ? 2 : 4);

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
