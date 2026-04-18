import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyTenderRecommendationsWithAI,
  maybeRerankTenderRecommendationsWithAI,
} from "@/lib/tender-recommendation-rerank";
import { ensureCompanyProfileEnrichment } from "@/lib/ai-profile-enrichment";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  selectTenderRecommendations,
  type RecommendationCompanySource,
  type RecommendationContext,
  type RecommendationTenderInput,
  type ScoredTenderRecommendation,
} from "@/lib/tender-recommendations";
import type { Database } from "@/types/database";

interface PersonalizedTenderOptions {
  company: RecommendationCompanySource;
  companyId?: string;
  select?: string;
  nowIso?: string;
  candidateLimit?: number;
  minimumResults?: number;
  limit?: number;
  shortlistSize?: number;
  rerank?: boolean;
  classify?: boolean;
  excludeTenderIds?: Iterable<string>;
}

export interface PersonalizedTenderResult<TTender extends RecommendationTenderInput> {
  context: RecommendationContext;
  hasSignals: boolean;
  totalCount: number;
  recommendations: Array<ScoredTenderRecommendation<TTender>>;
}

export async function getPersonalizedTenderRecommendations<
  TTender extends RecommendationTenderInput,
>(
  supabase: SupabaseClient<Database>,
  options: PersonalizedTenderOptions
): Promise<PersonalizedTenderResult<TTender>> {
  let companySource = options.company;
  if (options.companyId) {
    const enrichedIndustry = await ensureCompanyProfileEnrichment(
      supabase,
      options.companyId,
      companySource.industry ?? null
    );
    if (enrichedIndustry !== companySource.industry) {
      companySource = { ...companySource, industry: enrichedIndustry };
    }
  }
  const context = buildRecommendationContext(companySource);
  const hasSignals = hasRecommendationSignals(context);

  if (!hasSignals) {
    return {
      context,
      hasSignals,
      totalCount: 0,
      recommendations: [],
    };
  }

  const excludeTenderIds = new Set(options.excludeTenderIds ?? []);
  const candidates = await fetchRecommendedTenderCandidates<TTender>(supabase, context, {
    select: options.select,
    nowIso: options.nowIso,
    limit: options.candidateLimit,
  });

  const availableCandidates =
    excludeTenderIds.size > 0
      ? candidates.filter((tender) => !excludeTenderIds.has(tender.id))
      : candidates;

  let recommendations = selectTenderRecommendations(availableCandidates, context, {
    minimumResults: options.minimumResults,
  });

  if (options.classify !== false && recommendations.length > 1) {
    recommendations = await classifyTenderRecommendationsWithAI(
      recommendations,
      context
    );
  }

  const totalCount = recommendations.length;

  if (options.rerank !== false && recommendations.length > 1) {
    recommendations = await maybeRerankTenderRecommendationsWithAI(
      recommendations,
      context,
      {
        limit: options.limit,
        shortlistSize: options.shortlistSize,
      }
    );
  } else if (typeof options.limit === "number") {
    recommendations = recommendations.slice(0, options.limit);
  }

  return {
    context,
    hasSignals,
    totalCount,
    recommendations,
  };
}
