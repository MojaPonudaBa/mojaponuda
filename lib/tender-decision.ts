import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRecommendationContext,
  scoreTenderRecommendation,
  type RecommendationCompanySource,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";
import type { Database, Json } from "@/types/database";

export type DecisionRecommendation = "bid" | "risky" | "skip";
export type CompetitionLevel = "low" | "medium" | "high" | "unknown";
export type DecisionConfidence = "high" | "medium" | "low";
export type RiskTone = "critical" | "warning" | "info";

export interface TenderDecisionTender extends RecommendationTenderInput {
  procedure_type?: string | null;
  status?: string | null;
  created_at?: string | null;
  portal_url?: string | null;
  ai_analysis?: Json | null;
}

export interface TenderDecisionCompany extends RecommendationCompanySource {
  id?: string | null;
  jib?: string | null;
}

export interface TenderDecisionSignal {
  matchScore?: number | null;
  relevanceScore?: number | null;
  confidence?: number | null;
  reasons?: string[];
}

export interface TenderDecisionPriceRange {
  min: number | null;
  max: number | null;
  optimal: number | null;
  averageDiscountPct: number | null;
  confidence: DecisionConfidence;
  basedOn: "authority+cpv" | "authority" | "cpv" | "estimated_value" | "none";
  sampleCount: number;
  explanation: string;
}

export interface TenderRiskIndicator {
  label: string;
  tone: RiskTone;
}

export interface TenderWinningDiscountRange {
  min: number | null;
  max: number | null;
  typical: number | null;
  confidence: DecisionConfidence;
  sampleCount: number;
  explanation: string;
}

export interface TenderExpectedBiddersRange {
  min: number | null;
  max: number | null;
  confidence: DecisionConfidence;
  explanation: string;
}

export interface TenderTopCompetitor {
  jib: string | null;
  name: string;
  wins: number;
}

export interface TenderAuthorityProfile {
  tenderCount: number;
  averageBidders: number | null;
  averageDiscountPct: number | null;
  repeatSupplierCount: number;
}

export interface TenderDecisionInsight {
  tenderId: string;
  matchScore: number;
  winProbability: number;
  winConfidence: DecisionConfidence;
  priceRange: TenderDecisionPriceRange;
  winningDiscountRange: TenderWinningDiscountRange;
  competitionLevel: CompetitionLevel;
  competitionLabel: string;
  expectedBiddersRange: TenderExpectedBiddersRange;
  averageBidders: number | null;
  activeCompetitors: number;
  topCompetitors: TenderTopCompetitor[];
  authorityProfile: TenderAuthorityProfile;
  riskIndicators: TenderRiskIndicator[];
  riskLevel: "low" | "medium" | "high";
  recommendation: DecisionRecommendation;
  recommendationLabel: string;
  priorityScore: number;
  estimatedEffort: string;
  keyReasons: string[];
  explanation: string;
  dataQuality: DecisionConfidence;
}

interface AuthorityStatsRow {
  authority_jib: string;
  authority_name: string | null;
  tender_count: number;
  total_estimated_value: number | null;
  avg_contract_value: number | null;
  avg_bidders_count: number | null;
  avg_discount_pct: number | null;
  top_cpv_codes: string[] | null;
}

interface CpvStatsRow {
  cpv_code: string;
  tender_count: number;
  avg_estimated_value: number | null;
  avg_bidders_count: number | null;
  avg_discount_pct: number | null;
}

interface AuthorityCpvStatsRow {
  authority_jib: string;
  cpv_code: string;
  tender_count: number;
  avg_discount_pct: number | null;
  min_winning_price: number | null;
  max_winning_price: number | null;
  avg_winning_price: number | null;
  avg_bidders_count: number | null;
}

interface CompanySegmentStatsRow {
  company_jib: string;
  authority_jib?: string | null;
  cpv_code?: string | null;
  appearances: number;
  wins: number;
  win_rate: number | null;
}

interface AwardDecisionRow {
  contracting_authority_jib: string | null;
  winner_jib: string | null;
  winner_name: string | null;
  winning_price: number | null;
  estimated_value: number | null;
  discount_pct: number | null;
  total_bidders_count: number | null;
  procedure_type: string | null;
  tender_id: string | null;
  tenders?: { cpv_code: string | null } | { cpv_code: string | null }[] | null;
}

interface BulkDecisionData {
  authorityStatsByJib: Map<string, AuthorityStatsRow>;
  cpvStatsByPrefix: Map<string, CpvStatsRow>;
  authorityCpvStatsByKey: Map<string, AuthorityCpvStatsRow>;
  companyAuthorityStatsByJib: Map<string, CompanySegmentStatsRow>;
  companyCpvStatsByPrefix: Map<string, CompanySegmentStatsRow>;
  awardsByScope: Map<string, AwardDecisionRow[]>;
  awardsByAuthority: Map<string, AwardDecisionRow[]>;
}

function normalizeCpvPrefix(value: string | null | undefined): string | null {
  const normalized = value?.replace(/[^0-9]/g, "") ?? "";
  return normalized.length >= 3 ? normalized.slice(0, 3) : null;
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 0): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function sortedNumbers(values: Array<number | null | undefined>, options: { min?: number; max?: number } = {}): number[] {
  return values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .filter((value) => (options.min === undefined || value >= options.min) && (options.max === undefined || value <= options.max))
    .sort((a, b) => a - b);
}

function percentile(sortedValues: number[], q: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * clamp(q, 0, 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function confidenceFromSample(count: number, medium = 8, high = 25): DecisionConfidence {
  if (count >= high) return "high";
  if (count >= medium) return "medium";
  return "low";
}

function uniq(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function getDaysUntil(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const value = new Date(deadline).getTime();
  if (!Number.isFinite(value)) return null;
  return Math.ceil((value - Date.now()) / 86_400_000);
}

function getAiRiskFlags(aiAnalysis: Json | null | undefined): string[] {
  if (!aiAnalysis || typeof aiAnalysis !== "object" || Array.isArray(aiAnalysis)) {
    return [];
  }

  const value = aiAnalysis as Record<string, unknown>;
  const direct = value.risk_flags;
  const nested = value.risks;
  const flags = Array.isArray(direct) ? direct : Array.isArray(nested) ? nested : [];

  return flags
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function getTextRiskSignals(tender: TenderDecisionTender): TenderRiskIndicator[] {
  const text = `${tender.title ?? ""} ${tender.raw_description ?? ""} ${tender.procedure_type ?? ""}`.toLowerCase();
  const risks: TenderRiskIndicator[] = [];

  if (text.includes("garanc")) {
    risks.push({ label: "Moguća garancija ili obezbjeđenje ponude", tone: "warning" });
  }

  if (text.includes("e-auk") || text.includes("e auk")) {
    risks.push({ label: "Moguća e-aukcija i dodatni pritisak na cijenu", tone: "warning" });
  }

  if (text.includes("hitno") || text.includes("skraćeni rok")) {
    risks.push({ label: "Skraćen ili hitan rok u dokumentaciji", tone: "critical" });
  }

  if (text.includes("obilazak") || text.includes("uvid u lokaciju")) {
    risks.push({ label: "Potreban obilazak ili dodatna koordinacija", tone: "info" });
  }

  return risks;
}

function normalizeMatchScore(
  tender: TenderDecisionTender,
  company: TenderDecisionCompany | null | undefined,
  signal: TenderDecisionSignal | undefined,
): { matchScore: number; reasons: string[]; confidence: DecisionConfidence } {
  if (typeof signal?.matchScore === "number" && Number.isFinite(signal.matchScore)) {
    return {
      matchScore: clamp(Math.round(signal.matchScore), 0, 100),
      reasons: signal.reasons ?? [],
      confidence: signal.confidence && signal.confidence >= 4 ? "high" : "medium",
    };
  }

  if (typeof signal?.relevanceScore === "number" && Number.isFinite(signal.relevanceScore)) {
    const score = clamp(Math.round(signal.relevanceScore * 10), 10, 100);
    return {
      matchScore: score,
      reasons: signal.reasons ?? [`Usklađenost s profilom ${signal.relevanceScore}/10`],
      confidence: signal.confidence && signal.confidence >= 4 ? "high" : "medium",
    };
  }

  if (company) {
    try {
      const context = buildRecommendationContext(company);
      const scored = scoreTenderRecommendation(tender, context);
      const base = scored.qualifies ? 58 : scored.fallbackEligible ? 50 : 38;
      const computed = clamp(base + scored.score * 3 + scored.positiveSignalCount * 2, 18, 96);
      return {
        matchScore: Math.round(computed),
        reasons: scored.reasons,
        confidence: scored.qualifies ? "medium" : "low",
      };
    } catch {
      // Fall through to a neutral score if profile parsing fails.
    }
  }

  return {
    matchScore: 50,
    reasons: [],
    confidence: "low",
  };
}

function getSignalMatchScore(signal: TenderDecisionSignal | undefined): number | null {
  if (typeof signal?.matchScore === "number" && Number.isFinite(signal.matchScore)) {
    return clamp(Math.round(signal.matchScore), 0, 100);
  }

  if (typeof signal?.relevanceScore === "number" && Number.isFinite(signal.relevanceScore)) {
    return clamp(Math.round(signal.relevanceScore * 10), 10, 100);
  }

  return null;
}

function shouldRefreshStoredInsight(
  insight: TenderDecisionInsight,
  signal: TenderDecisionSignal | undefined,
): boolean {
  const signalScore = getSignalMatchScore(signal);
  if (signalScore === null) return false;

  return Math.abs(signalScore - insight.matchScore) >= 8;
}

function getAuthorityCpvKey(authorityJib: string | null | undefined, cpvPrefix: string | null): string | null {
  return authorityJib && cpvPrefix ? `${authorityJib}:${cpvPrefix}` : null;
}

function buildHistoricalPriceFallback(
  prices: number[],
  input: {
    basedOn: TenderDecisionPriceRange["basedOn"];
    explanation: string;
    mediumThreshold?: number;
    highThreshold?: number;
  },
): TenderDecisionPriceRange | null {
  if (prices.length < 3) return null;
  const low = percentile(prices, 0.25) ?? Math.min(...prices);
  const high = percentile(prices, 0.75) ?? Math.max(...prices);
  const typical = percentile(prices, 0.5) ?? prices[Math.floor(prices.length / 2)];
  return {
    min: Math.round(low),
    max: Math.round(high),
    optimal: Math.round(typical),
    averageDiscountPct: null,
    confidence: confidenceFromSample(prices.length, input.mediumThreshold ?? 8, input.highThreshold ?? 30),
    basedOn: input.basedOn,
    sampleCount: prices.length,
    explanation: input.explanation,
  };
}

function buildPriceRange(
  tender: TenderDecisionTender,
  authorityStats: AuthorityStatsRow | undefined,
  cpvStats: CpvStatsRow | undefined,
  authorityCpvStats: AuthorityCpvStatsRow | undefined,
  scopedAwards: AwardDecisionRow[],
  authorityAwards: AwardDecisionRow[],
): TenderDecisionPriceRange {
  const estimatedValue = numberOrNull(tender.estimated_value);
  const scopedWinningPrices = sortedNumbers(
    scopedAwards.map((award) => numberOrNull(award.winning_price)),
    { min: 1 },
  );
  const authorityWinningPrices = sortedNumbers(
    authorityAwards.map((award) => numberOrNull(award.winning_price)),
    { min: 1 },
  );

  if (!estimatedValue || estimatedValue <= 0) {
    const scopedFallback = buildHistoricalPriceFallback(scopedWinningPrices, {
      basedOn: "authority+cpv",
      explanation: `Procijenjena vrijednost nije objavljena; raspon je izveden iz ${scopedWinningPrices.length} historijskih pobjednickih cijena kod istog narucioca i CPV grupe.`,
    });
    if (scopedFallback) {
      return scopedFallback;
    }

    const historicalAverage = numberOrNull(authorityCpvStats?.avg_winning_price);
    if (historicalAverage && authorityCpvStats && authorityCpvStats.tender_count >= 8) {
      const minPrice = numberOrNull(authorityCpvStats.min_winning_price) ?? historicalAverage * 0.85;
      const maxPrice = numberOrNull(authorityCpvStats.max_winning_price) ?? historicalAverage * 1.15;
      return {
        min: Math.round(Math.min(minPrice, historicalAverage)),
        max: Math.round(Math.max(maxPrice, historicalAverage)),
        optimal: Math.round(historicalAverage),
        averageDiscountPct: null,
        confidence: authorityCpvStats.tender_count >= 30 && authorityCpvStats.min_winning_price !== null ? "medium" : "low",
        basedOn: "authority+cpv",
        sampleCount: authorityCpvStats.tender_count,
        explanation: "Procijenjena vrijednost nije objavljena; prikazan je historijski raspon slicnih ugovora, ne budzet ovog tendera.",
      };
    }

    const authorityFallback = buildHistoricalPriceFallback(authorityWinningPrices, {
      basedOn: "authority",
      explanation: `Procijenjena vrijednost nije objavljena; raspon prikazuje ${authorityWinningPrices.length} ranijih pobjednickih cijena kod istog narucioca, bez CPV preciznosti.`,
      mediumThreshold: 12,
      highThreshold: 50,
    });
    if (authorityFallback) {
      return {
        ...authorityFallback,
        confidence: authorityFallback.confidence === "high" ? "medium" : authorityFallback.confidence,
      };
    }

    return {
      min: null,
      max: null,
      optimal: null,
      averageDiscountPct: null,
      confidence: "low",
      basedOn: "none",
      sampleCount: 0,
      explanation: "Procijenjena vrijednost nije dostupna, pa raspon cijene nije pouzdan.",
    };
  }

  const scopedDiscounts = sortedNumbers(
    scopedAwards.map((award) => numberOrNull(award.discount_pct)),
    { min: 0, max: 80 },
  );

  if (scopedDiscounts.length >= 3) {
    const lowDiscount = clamp(percentile(scopedDiscounts, 0.25) ?? 0, 0, 55);
    const highDiscount = clamp(percentile(scopedDiscounts, 0.75) ?? lowDiscount, 0, 55);
    const typical = clamp(percentile(scopedDiscounts, 0.5) ?? lowDiscount, 0, 55);
    return {
      min: Math.round(estimatedValue * (1 - highDiscount / 100)),
      max: Math.round(estimatedValue * (1 - lowDiscount / 100)),
      optimal: Math.round(estimatedValue * (1 - typical / 100)),
      averageDiscountPct: round(typical, 1),
      confidence: confidenceFromSample(scopedDiscounts.length, 6, 20),
      basedOn: "authority+cpv",
      sampleCount: scopedDiscounts.length,
      explanation: `Raspon cijene je zasnovan na ${scopedDiscounts.length} sličnih ishoda kod istog naručioca i CPV grupe.`,
    };
  }

  const source =
    authorityCpvStats && authorityCpvStats.tender_count >= 8 && authorityCpvStats.avg_discount_pct !== null
      ? {
          discount: Number(authorityCpvStats.avg_discount_pct),
          count: authorityCpvStats.tender_count,
          basedOn: "authority+cpv" as const,
          confidence: authorityCpvStats.tender_count >= 25 ? "high" as const : "medium" as const,
          explanation: `Zasnovano na ponašanju naručioca u istoj CPV kategoriji (${authorityCpvStats.tender_count} ishoda).`,
        }
      : authorityStats && authorityStats.tender_count >= 15 && authorityStats.avg_discount_pct !== null
        ? {
            discount: Number(authorityStats.avg_discount_pct),
            count: authorityStats.tender_count,
            basedOn: "authority" as const,
            confidence: authorityStats.tender_count >= 40 ? "medium" as const : "low" as const,
            explanation: `Zasnovano na prosječnom pobjedničkom popustu ovog naručioca (${authorityStats.tender_count} postupaka).`,
          }
        : cpvStats && cpvStats.tender_count >= 50 && cpvStats.avg_discount_pct !== null
          ? {
              discount: Number(cpvStats.avg_discount_pct),
              count: cpvStats.tender_count,
              basedOn: "cpv" as const,
              confidence: cpvStats.tender_count >= 150 ? "medium" as const : "low" as const,
              explanation: `Zasnovano na prosjeku CPV grupe (${cpvStats.tender_count} ishoda).`,
            }
          : null;

  if (!source) {
    return {
      min: null,
      max: null,
      optimal: null,
      averageDiscountPct: null,
      confidence: "low",
      basedOn: "none",
      sampleCount: 0,
      explanation: "Nema dovoljno historijskih ishoda za pouzdanu procjenu cijene.",
    };
  }

  const discount = clamp(source.discount, 0, 35);
  const optimal = estimatedValue * (1 - discount / 100);
  const min = estimatedValue * (1 - clamp(discount + 3, 0, 35) / 100);
  const max = estimatedValue * (1 - clamp(discount - 3, 0, 35) / 100);

  return {
    min: Math.round(min),
    max: Math.round(max),
    optimal: Math.round(optimal),
    averageDiscountPct: round(discount, 1),
    confidence: source.confidence,
    basedOn: source.basedOn,
    sampleCount: source.count,
    explanation: source.explanation,
  };
}

function buildWinProbability(input: {
  avgBidders: number | null;
  avgBiddersSampleCount?: number;
  companyAuthorityStats?: CompanySegmentStatsRow;
  companyCpvStats?: CompanySegmentStatsRow;
}): { probability: number; confidence: DecisionConfidence; reasons: string[] } {
  const reasons: string[] = [];
  const avgBidders = input.avgBidders && input.avgBidders > 0 ? input.avgBidders : null;
  let probability: number | null = avgBidders ? 100 / avgBidders : null;
  let historyCount = 0;
  const directRates: Array<{ rate: number; weight: number }> = [];

  if (avgBidders) {
    reasons.push(`Prosječna konkurencija je ${round(avgBidders, 1)} ponuđača.`);
  } else {
    reasons.push("Nema dovoljno podataka o broju ponuđača za pouzdanu procjenu šanse.");
  }

  if (
    input.companyAuthorityStats &&
    input.companyAuthorityStats.appearances >= 3 &&
    input.companyAuthorityStats.win_rate !== null &&
    input.companyAuthorityStats.appearances > input.companyAuthorityStats.wins
  ) {
    const rate = clamp(Number(input.companyAuthorityStats.win_rate), 0, 100);
    historyCount += input.companyAuthorityStats.appearances;
    directRates.push({ rate, weight: input.companyAuthorityStats.appearances * 1.25 });
    reasons.push(
      `Vaša firma kod ovog naručioca ima ${round(rate, 1)}% uspješnosti kroz ${input.companyAuthorityStats.appearances} nastupa.`,
    );
  }

  if (
    input.companyCpvStats &&
    input.companyCpvStats.appearances >= 3 &&
    input.companyCpvStats.win_rate !== null &&
    input.companyCpvStats.appearances > input.companyCpvStats.wins
  ) {
    const rate = clamp(Number(input.companyCpvStats.win_rate), 0, 100);
    historyCount += input.companyCpvStats.appearances;
    directRates.push({ rate, weight: input.companyCpvStats.appearances });
    reasons.push(
      `U ovoj CPV grupi imate ${round(rate, 1)}% uspješnosti kroz ${input.companyCpvStats.appearances} nastupa.`,
    );
  }

  if (directRates.length > 0) {
    const totalWeight = directRates.reduce((sum, item) => sum + item.weight, 0);
    const personalizedRate =
      totalWeight > 0
        ? directRates.reduce((sum, item) => sum + item.rate * item.weight, 0) / totalWeight
        : null;

    if (personalizedRate !== null) {
      probability =
        probability === null
          ? personalizedRate
          : probability * (historyCount >= 10 ? 0.55 : 0.7) + personalizedRate * (historyCount >= 10 ? 0.45 : 0.3);
    }
  }

  if (probability === null) {
    return {
      probability: 0,
      confidence: "low",
      reasons,
    };
  }

  const confidence: DecisionConfidence =
    (input.avgBiddersSampleCount ?? 0) >= 20 && historyCount >= 10
      ? "high"
      : (input.avgBiddersSampleCount ?? 0) >= 6 || historyCount >= 6
        ? "medium"
        : "low";

  return {
    probability: confidence === "low" ? 0 : Math.round(clamp(probability, 5, 95)),
    confidence,
    reasons,
  };
}

function getCompetition(avgBidders: number | null, activeCompetitors: number): {
  level: CompetitionLevel;
  label: string;
} {
  if (!avgBidders) {
    if (activeCompetitors >= 8) {
      return { level: "high", label: `Visoka konkurencija (${activeCompetitors} poznatih pobjednika, indirektan signal)` };
    }
    if (activeCompetitors >= 3) {
      return { level: "medium", label: `Srednja konkurencija (${activeCompetitors} poznatih pobjednika, indirektan signal)` };
    }
    if (activeCompetitors > 0) {
      return { level: "low", label: `Ogranicena historijska konkurencija (${activeCompetitors} poznatih pobjednika)` };
    }
    return { level: "unknown", label: "Nema dovoljno podataka" };
  }

  const basis = avgBidders;
  if (basis <= 2.5) return { level: "low", label: "Niska konkurencija" };
  if (basis <= 4.5) return { level: "medium", label: "Srednja konkurencija" };
  return { level: "high", label: "Visoka konkurencija" };
}

function buildRiskIndicators(input: {
  tender: TenderDecisionTender;
  matchScore: number;
  winProbability: number;
  winConfidence: DecisionConfidence;
  competitionLevel: CompetitionLevel;
  priceRange: TenderDecisionPriceRange;
}): TenderRiskIndicator[] {
  const { tender, matchScore, winProbability, winConfidence, competitionLevel, priceRange } = input;
  const risks: TenderRiskIndicator[] = [];
  const days = getDaysUntil(tender.deadline);

  if (days !== null && days < 0) {
    risks.push({ label: "Rok za prijavu je istekao", tone: "critical" });
  } else if (days !== null && days <= 5) {
    risks.push({ label: `Kratak rok: ${Math.max(days, 0)} dana`, tone: "critical" });
  } else if (days !== null && days <= 10) {
    risks.push({ label: `Rok traži brzu pripremu: ${days} dana`, tone: "warning" });
  }

  if (matchScore < 55) {
    risks.push({ label: "Slabija usklađenost sa profilom", tone: "warning" });
  }

  if (winProbability > 0 && winProbability < 18) {
    risks.push({ label: "Niska procijenjena šansa za pobjedu", tone: "warning" });
  }

  if (winConfidence === "low") {
    risks.push({ label: "Nedovoljno historijskih podataka za pouzdanu šansu", tone: "warning" });
  }

  if (competitionLevel === "high") {
    risks.push({ label: "Visok pritisak konkurencije", tone: "warning" });
  }

  if (priceRange.confidence === "low") {
    risks.push({ label: "Ograničena pouzdanost predikcije cijene", tone: "info" });
  }

  if (!tender.estimated_value) {
    risks.push({ label: "Procijenjena vrijednost nije objavljena", tone: "info" });
  }

  for (const flag of getAiRiskFlags(tender.ai_analysis)) {
    risks.push({ label: flag, tone: "warning" });
  }

  risks.push(...getTextRiskSignals(tender));

  const seen = new Set<string>();
  return risks.filter((risk) => {
    const key = risk.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

function getRiskLevel(risks: TenderRiskIndicator[]): "low" | "medium" | "high" {
  if (risks.some((risk) => risk.tone === "critical")) return "high";
  if (risks.filter((risk) => risk.tone === "warning").length >= 2) return "high";
  if (risks.some((risk) => risk.tone === "warning")) return "medium";
  return "low";
}

function buildWinningDiscountRange(
  awards: AwardDecisionRow[],
  priceRange: TenderDecisionPriceRange,
): TenderWinningDiscountRange {
  const discounts = sortedNumbers(
    awards.map((award) => numberOrNull(award.discount_pct)),
    { min: 0, max: 80 },
  );

  if (discounts.length >= 3) {
    const min = round(percentile(discounts, 0.25) ?? Math.min(...discounts), 1);
    const max = round(percentile(discounts, 0.75) ?? Math.max(...discounts), 1);
    const typical = round(percentile(discounts, 0.5) ?? discounts[Math.floor(discounts.length / 2)], 1);
    return {
      min,
      max,
      typical,
      confidence: confidenceFromSample(discounts.length, 6, 20),
      sampleCount: discounts.length,
      explanation: `Tipičan pobjednički popust je zasnovan na ${discounts.length} historijskih ishoda.`,
    };
  }

  if (priceRange.averageDiscountPct !== null && priceRange.sampleCount >= 8) {
    return {
      min: round(Math.max(0, priceRange.averageDiscountPct - 3), 1),
      max: round(priceRange.averageDiscountPct + 3, 1),
      typical: priceRange.averageDiscountPct,
      confidence: priceRange.confidence,
      sampleCount: priceRange.sampleCount,
      explanation: "Raspon popusta izveden je iz agregiranog modela cijene.",
    };
  }

  return {
    min: null,
    max: null,
    typical: null,
    confidence: "low",
    sampleCount: 0,
    explanation: "Nema dovoljno historijskih cijena za pobjednički popust.",
  };
}

function buildExpectedBiddersRange(
  awards: AwardDecisionRow[],
  avgBidders: number | null,
  aggregateSampleCount = 0,
  scopeLabel = "slicnih ishoda",
): TenderExpectedBiddersRange {
  void scopeLabel;
  const bidders = sortedNumbers(
    awards.map((award) => numberOrNull(award.total_bidders_count)),
    { min: 1 },
  );

  if (bidders.length >= 3) {
    return {
      min: Math.max(1, Math.floor(percentile(bidders, 0.25) ?? Math.min(...bidders))),
      max: Math.max(1, Math.ceil(percentile(bidders, 0.75) ?? Math.max(...bidders))),
      confidence: confidenceFromSample(bidders.length, 6, 20),
      explanation: `Očekivani broj ponuđača je izveden iz ${bidders.length} sličnih ishoda.`,
    };
  }

  if (avgBidders) {
    return {
      min: Math.max(1, Math.floor(avgBidders - 1)),
      max: Math.max(1, Math.ceil(avgBidders + 1)),
      confidence: confidenceFromSample(aggregateSampleCount, 12, 40),
      explanation: "Raspon ponuđača je izveden iz agregiranog prosjeka za naručioca ili CPV.",
    };
  }

  return {
    min: null,
    max: null,
    confidence: "low",
    explanation: "Nema dovoljno historijskih podataka o broju ponuđača.",
  };
}

function buildTopCompetitors(awards: AwardDecisionRow[]): TenderTopCompetitor[] {
  const map = new Map<string, TenderTopCompetitor>();
  for (const award of awards) {
    const key = award.winner_jib ?? award.winner_name;
    if (!key) continue;
    const existing = map.get(key) ?? {
      jib: award.winner_jib,
      name: award.winner_name ?? award.winner_jib ?? "Nepoznat ponuđač",
      wins: 0,
    };
    existing.wins += 1;
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins).slice(0, 5);
}

function chooseRecommendation(input: {
  matchScore: number;
  winProbability: number;
  dataQuality: DecisionConfidence;
  riskIndicators: TenderRiskIndicator[];
  daysUntilDeadline: number | null;
}): DecisionRecommendation {
  const criticalRisks = input.riskIndicators.filter((risk) => risk.tone === "critical").length;

  if (
    input.matchScore >= 76 &&
    input.winProbability >= 30 &&
    input.dataQuality !== "low" &&
    criticalRisks === 0
  ) {
    return "bid";
  }

  if (
    input.matchScore >= 88 &&
    input.winProbability === 0 &&
    criticalRisks === 0 &&
    (input.daysUntilDeadline === null || input.daysUntilDeadline > 7)
  ) {
    return "bid";
  }

  if (
    input.matchScore < 54 ||
    (input.winProbability > 0 && input.winProbability < 14) ||
    (input.daysUntilDeadline !== null && input.daysUntilDeadline < 0)
  ) {
    return "skip";
  }

  return "risky";
}

function getRecommendationLabel(value: DecisionRecommendation): string {
  if (value === "bid") return "Uđi";
  if (value === "skip") return "Preskoči";
  return "Provjeri pa uđi";
}

function getEstimatedEffort(tender: TenderDecisionTender, riskIndicators: TenderRiskIndicator[]): string {
  const value = numberOrNull(tender.estimated_value) ?? 0;
  const raw = `${tender.title} ${tender.raw_description ?? ""} ${tender.contract_type ?? ""}`.toLowerCase();
  let points = 1;

  if (value >= 1_000_000) points += 2;
  else if (value >= 250_000) points += 1;
  if (raw.includes("radov") || raw.includes("rekonstrukc") || raw.includes("izgrad")) points += 2;
  if (raw.length > 1500) points += 1;
  points += Math.min(2, riskIndicators.length);

  if (points >= 5) return "Visoko - 5 do 10 dana";
  if (points >= 3) return "Srednje - 3 do 5 dana";
  return "Nisko - 1 do 2 dana";
}

function getValueScore(estimatedValue: number | null): number {
  if (!estimatedValue || estimatedValue <= 0) return 8;
  if (estimatedValue >= 2_000_000) return 20;
  if (estimatedValue >= 750_000) return 17;
  if (estimatedValue >= 250_000) return 14;
  if (estimatedValue >= 75_000) return 11;
  return 8;
}

function getDataQuality(...values: DecisionConfidence[]): DecisionConfidence {
  if (values.includes("high") && !values.includes("low")) return "high";
  if (values.filter((value) => value === "low").length >= 2) return "low";
  return "medium";
}

function makeKeyReasons(input: {
  matchReasons: string[];
  winReasons: string[];
  priceRange: TenderDecisionPriceRange;
  competitionLabel: string;
  riskIndicators: TenderRiskIndicator[];
}): string[] {
  return [
    ...input.matchReasons,
    ...input.winReasons,
    input.priceRange.explanation,
    input.competitionLabel,
    ...input.riskIndicators.slice(0, 2).map((risk) => risk.label),
  ].filter(Boolean).slice(0, 5);
}

async function safeSelect<T>(
  promise: PromiseLike<{ data: unknown; error?: { message?: string } | null }>,
): Promise<T[]> {
  try {
    const { data, error } = await promise;
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

async function loadDecisionData(
  supabase: SupabaseClient<Database>,
  tenders: TenderDecisionTender[],
  company: TenderDecisionCompany | null | undefined,
): Promise<BulkDecisionData> {
  const anySupabase = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => unknown;
    };
  };

  const authorityJibs = uniq(tenders.map((tender) => tender.contracting_authority_jib));
  const cpvPrefixes = uniq(tenders.map((tender) => normalizeCpvPrefix(tender.cpv_code)));

  const [
    authorityRows,
    cpvRows,
    authorityCpvRows,
    companyAuthorityRows,
    companyCpvRows,
    awardRows,
  ] = await Promise.all([
    authorityJibs.length > 0
      ? safeSelect<AuthorityStatsRow>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (anySupabase.from("authority_stats").select("*") as any).in("authority_jib", authorityJibs),
        )
      : Promise.resolve([]),
    cpvPrefixes.length > 0
      ? safeSelect<CpvStatsRow>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (anySupabase.from("cpv_stats").select("*") as any).in("cpv_code", cpvPrefixes),
        )
      : Promise.resolve([]),
    authorityJibs.length > 0
      ? safeSelect<AuthorityCpvStatsRow>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (anySupabase.from("authority_cpv_stats").select("*") as any)
            .in("authority_jib", authorityJibs)
            .limit(1200),
        )
      : Promise.resolve([]),
    company?.jib && authorityJibs.length > 0
      ? safeSelect<CompanySegmentStatsRow>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (anySupabase.from("company_authority_stats").select("*") as any)
            .eq("company_jib", company.jib)
            .in("authority_jib", authorityJibs),
        )
      : Promise.resolve([]),
    company?.jib
      ? safeSelect<CompanySegmentStatsRow>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (anySupabase.from("company_cpv_stats").select("*") as any)
            .eq("company_jib", company.jib)
            .limit(600),
        )
      : Promise.resolve([]),
    authorityJibs.length > 0
      ? safeSelect<AwardDecisionRow>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (anySupabase
            .from("award_decisions")
            .select(
              "contracting_authority_jib, winner_jib, winner_name, winning_price, estimated_value, discount_pct, total_bidders_count, procedure_type, tender_id, tenders(cpv_code)",
            ) as any)
            .in("contracting_authority_jib", authorityJibs)
            .order("award_date", { ascending: false })
            .limit(1500),
        )
      : Promise.resolve([]),
  ]);

  const authorityStatsByJib = new Map(authorityRows.map((row) => [row.authority_jib, row]));
  const cpvStatsByPrefix = new Map(
    cpvRows.map((row) => [normalizeCpvPrefix(row.cpv_code) ?? row.cpv_code, row]),
  );
  const authorityCpvStatsByKey = new Map<string, AuthorityCpvStatsRow>();

  for (const row of authorityCpvRows) {
    const prefix = normalizeCpvPrefix(row.cpv_code);
    const key = getAuthorityCpvKey(row.authority_jib, prefix);
    if (!key) continue;

    const existing = authorityCpvStatsByKey.get(key);
    if (!existing || row.tender_count > existing.tender_count) {
      authorityCpvStatsByKey.set(key, row);
    }
  }

  const companyAuthorityStatsByJib = new Map(
    companyAuthorityRows
      .filter((row) => row.authority_jib)
      .map((row) => [row.authority_jib as string, row]),
  );
  const companyCpvStatsByPrefix = new Map<string, CompanySegmentStatsRow>();

  for (const row of companyCpvRows) {
    const prefix = normalizeCpvPrefix(row.cpv_code);
    if (!prefix) continue;
    const existing = companyCpvStatsByPrefix.get(prefix);
    if (!existing || row.appearances > existing.appearances) {
      companyCpvStatsByPrefix.set(prefix, row);
    }
  }

  const awardsByScope = new Map<string, AwardDecisionRow[]>();
  const awardsByAuthority = new Map<string, AwardDecisionRow[]>();
  for (const award of awardRows) {
    if (award.contracting_authority_jib) {
      const authorityAwards = awardsByAuthority.get(award.contracting_authority_jib) ?? [];
      authorityAwards.push(award);
      awardsByAuthority.set(award.contracting_authority_jib, authorityAwards);
    }

    const relatedTender = Array.isArray(award.tenders) ? award.tenders[0] : award.tenders;
    const prefix = normalizeCpvPrefix(relatedTender?.cpv_code);
    const key = getAuthorityCpvKey(award.contracting_authority_jib ?? undefined, prefix);
    if (!key) continue;
    const existing = awardsByScope.get(key) ?? [];
    existing.push(award);
    awardsByScope.set(key, existing);
  }

  return {
    authorityStatsByJib,
    cpvStatsByPrefix,
    authorityCpvStatsByKey,
    companyAuthorityStatsByJib,
    companyCpvStatsByPrefix,
    awardsByScope,
    awardsByAuthority,
  };
}

export async function computeTenderDecisionInsights(
  supabase: SupabaseClient<Database>,
  tenders: TenderDecisionTender[],
  company?: TenderDecisionCompany | null,
  signals: Map<string, TenderDecisionSignal> = new Map(),
): Promise<Map<string, TenderDecisionInsight>> {
  const data = await loadDecisionData(supabase, tenders, company);
  const insights = new Map<string, TenderDecisionInsight>();

  for (const tender of tenders) {
    const cpvPrefix = normalizeCpvPrefix(tender.cpv_code);
    const authorityJib = tender.contracting_authority_jib ?? null;
    const authorityCpvKey = getAuthorityCpvKey(authorityJib, cpvPrefix);
    const authorityStats = authorityJib ? data.authorityStatsByJib.get(authorityJib) : undefined;
    const cpvStats = cpvPrefix ? data.cpvStatsByPrefix.get(cpvPrefix) : undefined;
    const authorityCpvStats = authorityCpvKey ? data.authorityCpvStatsByKey.get(authorityCpvKey) : undefined;
    const scopedAwards = authorityCpvKey ? data.awardsByScope.get(authorityCpvKey) ?? [] : [];
    const authorityAwards = authorityJib ? data.awardsByAuthority.get(authorityJib) ?? [] : [];
    const scopedBiddersSampleCount = scopedAwards.filter((award) => numberOrNull(award.total_bidders_count) !== null).length;
    const authorityBiddersSampleCount = authorityAwards.filter((award) => numberOrNull(award.total_bidders_count) !== null).length;
    const competitionAwards = scopedBiddersSampleCount >= 3 ? scopedAwards : authorityAwards;
    const competitorAwards = scopedAwards.length >= 3 ? scopedAwards : authorityAwards;
    const avgBiddersSampleCount =
      scopedBiddersSampleCount >= 3 ? scopedBiddersSampleCount : authorityBiddersSampleCount;

    const avgBidders =
      (() => {
        const bidders = competitionAwards
          .map((award) => numberOrNull(award.total_bidders_count))
          .filter((value): value is number => value !== null && value > 0);
        return bidders.length >= 3
          ? bidders.reduce((sum, value) => sum + value, 0) / bidders.length
          : null;
      })();

    const activeCompetitors = new Set(
      competitorAwards
        .map((award) => award.winner_jib ?? award.winner_name)
        .filter((value): value is string => Boolean(value)),
    ).size;
    const match = normalizeMatchScore(tender, company, signals.get(tender.id));
    const priceRange = buildPriceRange(tender, authorityStats, cpvStats, authorityCpvStats, scopedAwards, authorityAwards);
    const winningDiscountRange = buildWinningDiscountRange(scopedAwards.length >= 3 ? scopedAwards : authorityAwards, priceRange);
    const win = buildWinProbability({
      avgBidders,
      avgBiddersSampleCount,
      companyAuthorityStats: authorityJib ? data.companyAuthorityStatsByJib.get(authorityJib) : undefined,
      companyCpvStats: cpvPrefix ? data.companyCpvStatsByPrefix.get(cpvPrefix) : undefined,
    });
    const competition = getCompetition(avgBidders, activeCompetitors);
    const expectedBiddersRange = buildExpectedBiddersRange(
      competitionAwards,
      avgBidders,
      avgBiddersSampleCount,
      scopedBiddersSampleCount >= 3 ? "slicnih ishoda" : "ishoda kod istog narucioca",
    );
    const topCompetitors = buildTopCompetitors(competitorAwards);
    const dataQuality = getDataQuality(match.confidence, win.confidence, priceRange.confidence);
    const riskIndicators = buildRiskIndicators({
      tender,
      matchScore: match.matchScore,
      winProbability: win.probability,
      winConfidence: win.confidence,
      competitionLevel: competition.level,
      priceRange,
    });
    const riskLevel = getRiskLevel(riskIndicators);
    const recommendation = chooseRecommendation({
      matchScore: match.matchScore,
      winProbability: win.probability,
      dataQuality,
      riskIndicators,
      daysUntilDeadline: getDaysUntil(tender.deadline),
    });
    const priorityScore = Math.round(
      clamp(
        match.matchScore * 0.34 +
          win.probability * 0.34 +
          getValueScore(numberOrNull(tender.estimated_value)) -
          riskIndicators.filter((risk) => risk.tone !== "info").length * 4,
        0,
        100,
      ),
    );
    const keyReasons = makeKeyReasons({
      matchReasons: match.reasons,
      winReasons: win.reasons,
      priceRange,
      competitionLabel: competition.label,
      riskIndicators,
    });
    const explanation =
      keyReasons.length > 0
        ? keyReasons.slice(0, 3).join(" ")
        : "Procjena je zasnovana na profilu firme, historijskim ishodima i dostupnim podacima tendera.";

    insights.set(tender.id, {
      tenderId: tender.id,
      matchScore: match.matchScore,
      winProbability: win.probability,
      winConfidence: win.confidence,
      priceRange,
      winningDiscountRange,
      competitionLevel: competition.level,
      competitionLabel: competition.label,
      expectedBiddersRange,
      averageBidders: avgBidders ? round(avgBidders, 1) : null,
      activeCompetitors,
      topCompetitors,
      authorityProfile: {
        tenderCount: authorityCpvStats?.tender_count ?? authorityStats?.tender_count ?? cpvStats?.tender_count ?? 0,
        averageBidders: avgBidders ? round(avgBidders, 1) : null,
        averageDiscountPct:
          numberOrNull(authorityCpvStats?.avg_discount_pct) ??
          numberOrNull(authorityStats?.avg_discount_pct) ??
          numberOrNull(cpvStats?.avg_discount_pct),
        repeatSupplierCount: topCompetitors.filter((competitor) => competitor.wins >= 2).length,
      },
      riskIndicators,
      riskLevel,
      recommendation,
      recommendationLabel: getRecommendationLabel(recommendation),
      priorityScore,
      estimatedEffort: getEstimatedEffort(tender, riskIndicators),
      keyReasons,
      explanation,
      dataQuality,
    });
  }

  return insights;
}

interface StoredTenderDecisionInsightRow {
  tender_id: string;
  match_score: number;
  win_probability: number;
  win_confidence: DecisionConfidence;
  price_range: TenderDecisionPriceRange;
  winning_discount_range: TenderWinningDiscountRange;
  competition_level: CompetitionLevel;
  competition_label: string;
  expected_bidders_range: TenderExpectedBiddersRange;
  average_bidders: number | null;
  active_competitors: number;
  top_competitors: TenderTopCompetitor[];
  authority_profile: TenderAuthorityProfile;
  risk_indicators: TenderRiskIndicator[];
  risk_level: "low" | "medium" | "high";
  recommendation: DecisionRecommendation;
  recommendation_label: string;
  priority_score: number;
  estimated_effort: string;
  key_reasons: string[];
  explanation: string;
  data_quality: DecisionConfidence;
}

function deserializeStoredInsight(row: StoredTenderDecisionInsightRow): TenderDecisionInsight {
  const recommendation = row.recommendation ?? "risky";

  return {
    tenderId: row.tender_id,
    matchScore: Number(row.match_score) || 0,
    winProbability: Number(row.win_probability) || 0,
    winConfidence: row.win_confidence ?? "low",
    priceRange: row.price_range,
    winningDiscountRange: row.winning_discount_range ?? {
      min: null,
      max: null,
      typical: row.price_range?.averageDiscountPct ?? null,
      confidence: row.price_range?.confidence ?? "low",
      sampleCount: row.price_range?.sampleCount ?? 0,
      explanation: "Raspon popusta nije precomputed za ovaj red.",
    },
    competitionLevel: row.competition_level ?? "unknown",
    competitionLabel: row.competition_label ?? "Nema dovoljno podataka",
    expectedBiddersRange: row.expected_bidders_range ?? {
      min: null,
      max: null,
      confidence: "low",
      explanation: "Raspon ponuđača nije precomputed za ovaj red.",
    },
    averageBidders: row.average_bidders !== null ? Number(row.average_bidders) : null,
    activeCompetitors: Number(row.active_competitors) || 0,
    topCompetitors: Array.isArray(row.top_competitors) ? row.top_competitors : [],
    authorityProfile: row.authority_profile ?? {
      tenderCount: 0,
      averageBidders: null,
      averageDiscountPct: null,
      repeatSupplierCount: 0,
    },
    riskIndicators: Array.isArray(row.risk_indicators) ? row.risk_indicators : [],
    riskLevel: row.risk_level ?? "medium",
    recommendation,
    recommendationLabel: getRecommendationLabel(recommendation),
    priorityScore: Number(row.priority_score) || 0,
    estimatedEffort: row.estimated_effort ?? "Nije procijenjeno",
    keyReasons: Array.isArray(row.key_reasons) ? row.key_reasons : [],
    explanation: row.explanation ?? "Procjena nije dostupna.",
    dataQuality: row.data_quality ?? "low",
  };
}

async function loadStoredDecisionInsights(
  supabase: SupabaseClient<Database>,
  companyId: string | null | undefined,
  tenderIds: string[],
): Promise<Map<string, TenderDecisionInsight>> {
  const map = new Map<string, TenderDecisionInsight>();
  if (!companyId || tenderIds.length === 0) return map;

  const anySupabase = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => unknown;
    };
  };

  for (let i = 0; i < tenderIds.length; i += 200) {
    const slice = tenderIds.slice(i, i + 200);
    const rows = await safeSelect<StoredTenderDecisionInsightRow>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (anySupabase.from("tender_decision_insights").select("*") as any)
        .eq("company_id", companyId)
        .in("tender_id", slice),
    );

    for (const row of rows) {
      map.set(row.tender_id, deserializeStoredInsight(row));
    }
  }

  return map;
}

function buildLightweightDecisionInsight(
  tender: TenderDecisionTender,
  company: TenderDecisionCompany | null | undefined,
  signal: TenderDecisionSignal | undefined,
): TenderDecisionInsight {
  const match = normalizeMatchScore(tender, company, signal);
  const estimatedValue = numberOrNull(tender.estimated_value);
  const priceRange: TenderDecisionPriceRange = estimatedValue
    ? {
        min: null,
        max: null,
        optimal: null,
        averageDiscountPct: null,
        confidence: "low",
        basedOn: "none",
        sampleCount: 0,
        explanation: "Objavljena vrijednost postoji, ali historijski model još nije izračunat pa raspon cijene nije prikazan.",
      }
    : {
        min: null,
        max: null,
        optimal: null,
        averageDiscountPct: null,
        confidence: "low",
        basedOn: "none",
        sampleCount: 0,
        explanation: "Procijenjena vrijednost nije dostupna, pa raspon cijene nije pouzdan.",
      };

  const winProbability = 0;
  const competition = getCompetition(null, 0);
  const winningDiscountRange = buildWinningDiscountRange([], priceRange);
  const expectedBiddersRange = buildExpectedBiddersRange([], null);
  const riskIndicators = buildRiskIndicators({
    tender,
    matchScore: match.matchScore,
    winProbability,
    winConfidence: "low",
    competitionLevel: competition.level,
    priceRange,
  });
  const daysUntilDeadline = getDaysUntil(tender.deadline);
  const recommendation =
    match.matchScore < 54 || (daysUntilDeadline !== null && daysUntilDeadline < 0)
      ? "skip"
      : match.matchScore >= 88 && (daysUntilDeadline === null || daysUntilDeadline > 7)
        ? "bid"
      : "risky";
  const riskLevel = getRiskLevel(riskIndicators);
  const keyReasons = makeKeyReasons({
    matchReasons: match.reasons,
    winReasons: ["Historijski model za ovaj tender još nije izračunat; odluka zahtijeva provjeru podataka."],
    priceRange,
    competitionLabel: competition.label,
    riskIndicators,
  });

  return {
    tenderId: tender.id,
    matchScore: match.matchScore,
    winProbability,
    winConfidence: "low",
    priceRange,
    winningDiscountRange,
    competitionLevel: competition.level,
    competitionLabel: competition.label,
    expectedBiddersRange,
    averageBidders: null,
    activeCompetitors: 0,
    topCompetitors: [],
    authorityProfile: {
      tenderCount: 0,
      averageBidders: null,
      averageDiscountPct: priceRange.averageDiscountPct,
      repeatSupplierCount: 0,
    },
    riskIndicators,
    riskLevel,
    recommendation,
    recommendationLabel: getRecommendationLabel(recommendation),
    priorityScore: Math.round(
      clamp(match.matchScore * 0.45 + winProbability * 0.35 + getValueScore(estimatedValue), 0, 100),
    ),
    estimatedEffort: getEstimatedEffort(tender, riskIndicators),
    keyReasons,
    explanation: keyReasons.slice(0, 3).join(" "),
    dataQuality: "low",
  };
}

export async function getTenderDecisionInsights(
  supabase: SupabaseClient<Database>,
  tenders: TenderDecisionTender[],
  company?: TenderDecisionCompany | null,
  signals: Map<string, TenderDecisionSignal> = new Map(),
): Promise<Map<string, TenderDecisionInsight>> {
  const tenderIds = tenders.map((tender) => tender.id);
  const insights = await loadStoredDecisionInsights(supabase, company?.id, tenderIds);
  const missingTenders = tenders.filter((tender) => !insights.has(tender.id));
  const staleTenders = tenders.filter((tender) => {
    const stored = insights.get(tender.id);
    return stored ? shouldRefreshStoredInsight(stored, signals.get(tender.id)) : false;
  });
  const tendersToCompute = [...missingTenders, ...staleTenders];

  if (company?.id && tendersToCompute.length > 0) {
    try {
      const computed = await computeTenderDecisionInsights(supabase, tendersToCompute, company, signals);
      for (const [tenderId, insight] of computed) {
        insights.set(tenderId, insight);
      }

      try {
        await upsertTenderDecisionInsights(supabase, company.id, computed.values());
      } catch {
        // UI coverage is more important than failing the page if persistence is unavailable.
      }
    } catch {
      // Fall through to lightweight guidance below.
    }
  }

  for (const tender of tenders) {
    if (insights.has(tender.id)) continue;
    insights.set(tender.id, buildLightweightDecisionInsight(tender, company, signals.get(tender.id)));
  }

  return insights;
}

export async function upsertTenderDecisionInsights(
  supabase: SupabaseClient<Database>,
  companyId: string,
  insights: Iterable<TenderDecisionInsight>,
): Promise<number> {
  const rows = [...insights].map((insight) => ({
    company_id: companyId,
    tender_id: insight.tenderId,
    match_score: insight.matchScore,
    win_probability: insight.winProbability,
    win_confidence: insight.winConfidence,
    price_range: insight.priceRange as unknown as Json,
    winning_discount_range: insight.winningDiscountRange as unknown as Json,
    competition_level: insight.competitionLevel,
    competition_label: insight.competitionLabel,
    expected_bidders_range: insight.expectedBiddersRange as unknown as Json,
    average_bidders: insight.averageBidders,
    active_competitors: insight.activeCompetitors,
    top_competitors: insight.topCompetitors as unknown as Json,
    authority_profile: insight.authorityProfile as unknown as Json,
    risk_indicators: insight.riskIndicators as unknown as Json,
    risk_level: insight.riskLevel,
    recommendation: insight.recommendation,
    recommendation_label: insight.recommendationLabel,
    priority_score: insight.priorityScore,
    estimated_effort: insight.estimatedEffort,
    key_reasons: insight.keyReasons as unknown as Json,
    explanation: insight.explanation,
    data_quality: insight.dataQuality,
    source_version: "decision-v1",
    computed_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return 0;

  const anySupabase = supabase as unknown as {
    from: (table: string) => {
      upsert: (rows: unknown[], options: { onConflict: string }) => PromiseLike<{ error?: { message?: string } | null }>;
    };
  };

  for (let i = 0; i < rows.length; i += 250) {
    const slice = rows.slice(i, i + 250);
    const { error } = await anySupabase
      .from("tender_decision_insights")
      .upsert(slice, { onConflict: "company_id,tender_id" });
    if (error) throw new Error(error.message ?? "Neuspješan upis decision insight redova.");
  }

  return rows.length;
}

export function buildPreparationPlan(input: {
  tender: TenderDecisionTender | null;
  insight: TenderDecisionInsight | null;
  checklistCount?: number;
  missingChecklistCount?: number;
}): Array<{ title: string; detail: string; tone: "blue" | "green" | "amber" }> {
  const tender = input.tender;
  const insight = input.insight;
  const plan: Array<{ title: string; detail: string; tone: "blue" | "green" | "amber" }> = [];

  plan.push({
    title: "Kvalifikacija",
    detail: insight
      ? `${insight.recommendationLabel} signal, ${insight.matchScore}% usklađenost${
          insight.winProbability > 0 ? ` i ${insight.winProbability}% procijenjena šansa` : "; šansa traži historijski izračun"
        }.`
      : "Provjerite usklađenost, rok, vrijednost i osnovne uslove prije ulaska u pripremu.",
    tone: insight?.recommendation === "bid" ? "green" : insight?.recommendation === "skip" ? "amber" : "blue",
  });

  plan.push({
    title: "Cijena i konkurencija",
    detail:
      insight?.priceRange.optimal && insight.priceRange.min && insight.priceRange.max
        ? `Ciljni raspon ${insight.priceRange.min.toLocaleString("bs-BA")} - ${insight.priceRange.max.toLocaleString("bs-BA")} KM; ${insight.competitionLabel.toLowerCase()}.`
        : "Postavite interni raspon cijene i zabilježite pretpostavke prije kalkulacije.",
    tone: "blue",
  });

  plan.push({
    title: "Dokumentacija",
    detail:
      input.checklistCount && input.checklistCount > 0
        ? `${input.checklistCount - (input.missingChecklistCount ?? 0)}/${input.checklistCount} stavki je zatvoreno; otvorene stavke tretirati kao blokere.`
        : "Učitajte tendersku dokumentaciju da sistem izvuče dinamičku listu zahtjeva.",
    tone: input.missingChecklistCount && input.missingChecklistCount > 0 ? "amber" : "green",
  });

  const days = getDaysUntil(tender?.deadline ?? null);
  plan.push({
    title: "Predaja",
    detail:
      days === null
        ? "Rok nije objavljen; držite zadnju provjeru odvojenu od kalkulacije."
        : days <= 5
          ? `Rok je za ${Math.max(days, 0)} dana; zaključati odgovorne osobe danas.`
          : `Planirati finalnu provjeru najmanje 48h prije roka (${days} dana preostalo).`,
    tone: days !== null && days <= 5 ? "amber" : "green",
  });

  return plan;
}
