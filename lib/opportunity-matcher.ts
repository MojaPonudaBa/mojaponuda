import {
  buildOpportunityRecommendationContext,
  scoreOpportunityRecommendation,
  type OpportunityRecommendationInput,
} from "@/lib/opportunity-recommendations";

interface CompanyMatchProfile {
  industry?: string | null;
  keywords: string[] | null;
  cpv_codes?: string[] | null;
  operating_regions: string[] | null;
}

export function scoreOpportunityForCompany(
  opp: OpportunityRecommendationInput,
  company: CompanyMatchProfile
): number {
  const context = buildOpportunityRecommendationContext({
    industry: company.industry ?? null,
    keywords: company.keywords ?? [],
    cpv_codes: company.cpv_codes ?? [],
    operating_regions: company.operating_regions ?? [],
  });

  return scoreOpportunityRecommendation(opp, context).score;
}

export const GRANT_MATCH_THRESHOLD = 8;
