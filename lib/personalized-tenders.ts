import type { SupabaseClient } from "@supabase/supabase-js";
import { maybeRerankTenderRecommendationsWithAI } from "@/lib/tender-recommendation-rerank";
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
  select?: string;
  nowIso?: string;
  candidateLimit?: number;
  minimumResults?: number;
  limit?: number;
  shortlistSize?: number;
  rerank?: boolean;
  excludeTenderIds?: Iterable<string>;
}

export interface PersonalizedTenderResult<TTender extends RecommendationTenderInput> {
  context: RecommendationContext;
  hasSignals: boolean;
  recommendations: Array<ScoredTenderRecommendation<TTender>>;
}

export async function getPersonalizedTenderRecommendations<
  TTender extends RecommendationTenderInput,
>(
  supabase: SupabaseClient<Database>,
  options: PersonalizedTenderOptions
): Promise<PersonalizedTenderResult<TTender>> {
  const context = buildRecommendationContext(options.company);
  const hasSignals = hasRecommendationSignals(context);

  if (!hasSignals) {
    return {
      context,
      hasSignals,
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
    recommendations,
  };
}
