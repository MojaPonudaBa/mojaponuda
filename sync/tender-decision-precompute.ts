import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeTenderDecisionInsights,
  upsertTenderDecisionInsights,
  type TenderDecisionSignal,
  type TenderDecisionTender,
} from "@/lib/tender-decision";
import { getRecommendedTenders } from "@/lib/tender-relevance";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  selectTenderRecommendations,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";
import type { Database } from "@/types/database";

interface CompanyForDecision {
  id: string;
  jib: string | null;
  industry: string | null;
  keywords: string[] | null;
  cpv_codes: string[] | null;
  operating_regions: string[] | null;
  profile_embedded_at: string | null;
}

export interface TenderDecisionPrecomputeResult {
  companies_processed: number;
  insights_upserted: number;
  errors: string[];
  duration_ms: number;
}

const TENDER_COLUMNS =
  "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, procedure_type, raw_description, cpv_code, ai_analysis, created_at";

function hasCompanyDecisionSignals(company: CompanyForDecision): boolean {
  return Boolean(
    company.industry ||
      (company.keywords && company.keywords.length > 0) ||
      (company.cpv_codes && company.cpv_codes.length > 0) ||
      (company.operating_regions && company.operating_regions.length > 0),
  );
}

async function loadCompanies(
  supabase: SupabaseClient<Database>,
  limit: number,
): Promise<CompanyForDecision[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("companies")
    .select("id, jib, industry, keywords, cpv_codes, operating_regions, profile_embedded_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(Math.max(limit * 3, limit));

  if (error) throw new Error(error.message);
  return ((data ?? []) as CompanyForDecision[]).filter(hasCompanyDecisionSignals).slice(0, limit);
}

async function loadExistingBidTenderIds(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("bids")
    .select("tender_id")
    .eq("company_id", companyId);
  return new Set((data ?? []).map((row) => row.tender_id).filter((value): value is string => Boolean(value)));
}

async function loadTenderCandidatesForCompany(
  supabase: SupabaseClient<Database>,
  company: CompanyForDecision,
  tenderLimit: number,
): Promise<{ tenders: TenderDecisionTender[]; signals: Map<string, TenderDecisionSignal> }> {
  const signals = new Map<string, TenderDecisionSignal>();
  const selected = new Map<string, TenderDecisionTender>();
  const existingBidTenderIds = await loadExistingBidTenderIds(supabase, company.id);

  if (company.profile_embedded_at) {
    const scored = await getRecommendedTenders<TenderDecisionTender>(supabase, company.id, {
      topK: 220,
      limit: tenderLimit,
      minScore: 5,
      scoreMissing: false,
    });

    const tenders = scored
      .filter(({ tender }) => !existingBidTenderIds.has(tender.id))
      .slice(0, tenderLimit)
      .map(({ tender, score, confidence }) => {
        selected.set(tender.id, tender);
        signals.set(tender.id, {
          relevanceScore: score,
          confidence,
          reasons: [`Uskladjenost iz preporuka: ${score}/10`],
        });
        return tender;
      });

    if (tenders.length >= tenderLimit) {
      return { tenders, signals };
    }
  }

  const context = buildRecommendationContext(company);
  if (!hasRecommendationSignals(context)) {
    return { tenders: [...selected.values()].slice(0, tenderLimit), signals };
  }

  const candidates = await fetchRecommendedTenderCandidates<TenderDecisionTender & RecommendationTenderInput>(
    supabase,
    context,
    {
      select: TENDER_COLUMNS,
      limit: Math.max(160, tenderLimit * 5),
    },
  );
  const ranked = selectTenderRecommendations(
    candidates.filter((tender) => !existingBidTenderIds.has(tender.id)),
    context,
    { minimumResults: tenderLimit },
  ).slice(0, tenderLimit);

  for (const item of ranked) {
    if (selected.size >= tenderLimit) break;
    if (selected.has(item.tender.id)) continue;
    selected.set(item.tender.id, item.tender);
    signals.set(item.tender.id, {
      matchScore: Math.min(96, Math.max(42, 52 + item.score * 3)),
      reasons: item.reasons,
    });
  }

  return { tenders: [...selected.values()].slice(0, tenderLimit), signals };
}

export async function precomputeTenderDecisionInsights(
  supabase: SupabaseClient<Database>,
  options: { maxCompanies?: number; tenderLimit?: number } = {},
): Promise<TenderDecisionPrecomputeResult> {
  const startedAt = Date.now();
  const errors: string[] = [];
  const maxCompanies = options.maxCompanies ?? 500;
  const tenderLimit = options.tenderLimit ?? 250;
  let companiesProcessed = 0;
  let insightsUpserted = 0;

  const companies = await loadCompanies(supabase, maxCompanies);

  for (const company of companies) {
    try {
      const { tenders, signals } = await loadTenderCandidatesForCompany(supabase, company, tenderLimit);
      if (tenders.length === 0) continue;
      const insights = await computeTenderDecisionInsights(supabase, tenders, company, signals);
      insightsUpserted += await upsertTenderDecisionInsights(supabase, company.id, insights.values());
      companiesProcessed++;
    } catch (error) {
      errors.push(`${company.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    companies_processed: companiesProcessed,
    insights_upserted: insightsUpserted,
    errors,
    duration_ms: Date.now() - startedAt,
  };
}
