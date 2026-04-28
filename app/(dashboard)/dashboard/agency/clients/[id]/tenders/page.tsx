import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import type { Tender } from "@/types/database";
import { buildRegionSearchTerms } from "@/lib/constants/regions";
import {
  resolveTenderSort,
  sortRecommendedTenderItems,
} from "@/lib/tender-sorting";
import { ensureCompanyProfileEnrichment } from "@/lib/ai-profile-enrichment";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  matchesTenderLocationTerms,
  RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
  RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
  selectTenderRecommendations,
  TENDER_LIST_COLUMNS,
  type RecommendationContext,
} from "@/lib/tender-recommendations";
import { tenderMatchesClientFilters } from "@/lib/tender-client-filters";
import { TenderFilters } from "@/components/tenders/tender-filters";
import { TenderCard } from "@/components/tenders/tender-card";
import { Pagination } from "@/components/tenders/pagination";
import { Search, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

type SearchParamValue = string | string[] | undefined;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: SearchParamValue }>;
}

function getSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getMultiParam(value: SearchParamValue): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim().length > 0);
  }
  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
}

async function fetchAuthorityJibsForLocationTerms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  terms: string[],
): Promise<string[]> {
  const cleanTerms = [...new Set(
    terms
      .map((term) => term.trim())
      .filter((term) => term.length >= 3)
      .slice(0, 16),
  )];
  if (cleanTerms.length === 0) return [];

  const conditions = cleanTerms.flatMap((term) => {
    const safeTerm = term.replace(/,/g, " ");
    return [
      `name.ilike.%${safeTerm}%`,
      `city.ilike.%${safeTerm}%`,
      `municipality.ilike.%${safeTerm}%`,
      `canton.ilike.%${safeTerm}%`,
      `entity.ilike.%${safeTerm}%`,
    ];
  });

  const { data } = await supabase
    .from("contracting_authorities")
    .select("jib")
    .or(conditions.join(","))
    .limit(2500);

  return [...new Set((data ?? []).map((row) => row.jib).filter((value): value is string => Boolean(value)))];
}

async function TendersContent({ agencyClientId, companyId, recommendationContext, searchParams }: {
  agencyClientId: string;
  companyId: string;
  recommendationContext: RecommendationContext;
  searchParams: Promise<{ [key: string]: SearchParamValue }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const pageParam = getSingleParam(params.page);
  const tabParam = getSingleParam(params.tab);
  const keywordParam = getSingleParam(params.q) ?? "";
  const contractTypeParam = getSingleParam(params.contract_type) ?? "all";
  const procedureTypeParam = getSingleParam(params.procedure_type) ?? "all";
  const deadlineFromParam = getSingleParam(params.deadline_from) ?? "";
  const deadlineToParam = getSingleParam(params.deadline_to) ?? "";
  const valueMinParam = getSingleParam(params.value_min) ?? "";
  const valueMaxParam = getSingleParam(params.value_max) ?? "";
  const locationFilterValues = getMultiParam(params.location);
  const locationFilterTerms = buildRegionSearchTerms(locationFilterValues);

  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const activeTab = tabParam === "all" ? "all" : "recommended";
  const sortParam = resolveTenderSort(getSingleParam(params.sort), activeTab);
  const defaultSortForTab = activeTab === "recommended" ? "nearest" : "deadline_asc";

  const hasFilters =
    keywordParam ||
    (contractTypeParam && contractTypeParam !== "all") ||
    (procedureTypeParam && procedureTypeParam !== "all") ||
    deadlineFromParam ||
    deadlineToParam ||
    valueMinParam ||
    valueMaxParam ||
    locationFilterValues.length > 0 ||
    sortParam !== defaultSortForTab;

  let tenders: Tender[] = [];
  let totalCount = 0;

  if (activeTab === "recommended") {
    const { data: bidRows } = await supabase
      .from("bids")
      .select("tender_id")
      .eq("company_id", companyId);

    const existingBidTenderIds = new Set(
      (bidRows ?? []).map((r) => r.tender_id).filter((v): v is string => Boolean(v))
    );

    const candidates = await fetchRecommendedTenderCandidates<
      Tender & {
        authority_city: string | null;
        authority_municipality: string | null;
        authority_canton: string | null;
        authority_entity: string | null;
      }
    >(supabase, recommendationContext, {
      select: TENDER_LIST_COLUMNS,
      limit: RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
    });

    const available = candidates.filter((t) => !existingBidTenderIds.has(t.id));
    let ranked = selectTenderRecommendations(available, recommendationContext, {
      minimumResults: RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
    });

    ranked = ranked.filter(({ tender }) =>
      tenderMatchesClientFilters(tender, {
        keyword: keywordParam,
        contractType: contractTypeParam,
        procedureType: procedureTypeParam,
        deadlineFrom: deadlineFromParam,
        deadlineTo: deadlineToParam,
        valueMin: valueMinParam,
        valueMax: valueMaxParam,
      })
    );

    ranked = sortRecommendedTenderItems(ranked, sortParam);

    if (locationFilterTerms.length > 0) {
      ranked = ranked.filter(({ tender }) => matchesTenderLocationTerms(tender, locationFilterTerms));
    }

    totalCount = ranked.length;
    tenders = ranked.slice(offset, offset + PAGE_SIZE).map(({ tender }) => tender as Tender);
  } else {
    // All tenders tab
    const authorityJibs =
      locationFilterTerms.length > 0
        ? await fetchAuthorityJibsForLocationTerms(supabase, locationFilterTerms)
        : null;

    if (authorityJibs && authorityJibs.length === 0) {
      tenders = [];
      totalCount = 0;
    } else {
      let query = supabase
        .from("tenders")
        .select(TENDER_LIST_COLUMNS, { count: "estimated" });

      if (keywordParam) {
        const kw = `%${keywordParam}%`;
        query = query.or(`title.ilike.${kw},raw_description.ilike.${kw}`);
      }
      if (contractTypeParam !== "all") query = query.ilike("contract_type", `%${contractTypeParam}%`);
      if (procedureTypeParam !== "all") query = query.ilike("procedure_type", `%${procedureTypeParam}%`);
      if (deadlineFromParam) query = query.gte("deadline", new Date(deadlineFromParam).toISOString());
      if (deadlineToParam) query = query.lte("deadline", new Date(`${deadlineToParam}T23:59:59`).toISOString());
      if (valueMinParam) query = query.gte("estimated_value", parseFloat(valueMinParam));
      if (valueMaxParam) query = query.lte("estimated_value", parseFloat(valueMaxParam));
      if (authorityJibs && authorityJibs.length > 0) query = query.in("contracting_authority_jib", authorityJibs);

      const { data, count } = await query
        .order(
          sortParam === "value_desc" || sortParam === "value_asc"
            ? "estimated_value"
            : sortParam === "newest"
              ? "created_at"
              : "deadline",
          {
            ascending:
              sortParam === "value_asc" ||
              sortParam === "deadline_asc",
            nullsFirst: false,
          }
        )
        .range(offset, offset + PAGE_SIZE - 1);

      tenders = (data ?? []) as Tender[];
      totalCount = count ?? 0;
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const basePath = `/dashboard/agency/clients/${agencyClientId}/tenders`;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {activeTab === "recommended" ? "Preporučeno" : "Pronađeno"} {totalCount}{" "}
          {totalCount === 1 ? "tender" : "tendera"}
          {hasFilters && " (filtrirano)"}
        </p>
      </div>

      {tenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-slate-300 bg-slate-50 py-20">
          <div className="flex size-14 items-center justify-center rounded-sm bg-slate-200/50 text-slate-500 mb-4 border border-slate-300">
            <Search className="size-6" />
          </div>
          <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">
            {activeTab === "recommended"
              ? "Nema preporučenih tendera"
              : hasFilters
              ? "Nema tendera koji odgovaraju filterima"
              : "Nema tendera u bazi"}
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            {activeTab === "recommended"
              ? "Trenutno nema aktivnih tendera koji se dovoljno jasno poklapaju s profilom klijenta."
              : hasFilters
              ? "Pokušajte sa drugačijim filterima ili resetujte pretragu."
              : "Podaci se automatski sinhronizuju sa e-Nabavke portala."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((tender) => (
            <TenderCard
              key={tender.id}
              tender={tender}
              href={`/dashboard/agency/clients/${agencyClientId}/tenders/${tender.id}`}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
      </div>
    </>
  );
}

export default async function AgencyClientTendersPage({ params, searchParams }: PageProps) {
  const { id: agencyClientId } = await params;
  const resolvedParams = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (plan.id !== "agency") redirect("/dashboard");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies (id, name, industry, cpv_codes, keywords, operating_regions)")
    .eq("id", agencyClientId)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as {
    id: string; name: string; industry: string | null;
    cpv_codes: string[] | null; keywords: string[] | null; operating_regions: string[] | null;
  } | null;
  if (!company) notFound();

  const enrichedIndustry = await ensureCompanyProfileEnrichment(
    supabase,
    company.id,
    company.industry
  );
  const recommendationContext = buildRecommendationContext({
    industry: enrichedIndustry,
    keywords: company.keywords,
    cpv_codes: company.cpv_codes,
    operating_regions: company.operating_regions,
  });

  const activeTab = getSingleParam(resolvedParams.tab) === "all" ? "all" : "recommended";

  if (activeTab === "recommended" && !hasRecommendationSignals(recommendationContext)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tenderi — {company.name}
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Pregledajte sve aktivne tendere ili otvorite one koji se najbolje uklapaju u profil klijenta.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">Profil nije dovoljno popunjen</h3>
          <p className="mb-6 max-w-md text-slate-500">
            Da bi sistem mogao preporučiti tendere, profil klijenta mora imati djelatnost, lokaciju ili opis.
          </p>
          <Button asChild>
            <Link href={`/dashboard/agency/clients/${agencyClientId}`}>Nazad na pregled klijenta</Link>
          </Button>
        </div>
      </div>
    );
  }

  const basePath = `/dashboard/agency/clients/${agencyClientId}/tenders`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Tenderi — {company.name}
        </h1>
        <p className="mt-1.5 text-base text-slate-500">
          Pregledajte sve aktivne tendere ili otvorite one koji se najbolje uklapaju u profil klijenta.
        </p>
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full lg:w-[400px] grid-cols-2">
          <TabsTrigger value="recommended" asChild>
            <Link href={{ pathname: basePath, query: { ...resolvedParams, tab: "recommended", page: "1" } }} prefetch className="flex items-center gap-2">
              <Sparkles className="size-3.5" />
              Preporučeno
            </Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href={{ pathname: basePath, query: { ...resolvedParams, tab: "all", page: "1" } }} prefetch>
              Svi tenderi
            </Link>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <Suspense fallback={null}>
            <TenderFilters key={`filters-${activeTab}-${JSON.stringify(resolvedParams)}`} basePath={basePath} />
          </Suspense>

          <Suspense
            key={activeTab + JSON.stringify(resolvedParams)}
            fallback={
              <div className="flex flex-col items-center justify-center py-24">
                <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary mb-4" />
                <p className="text-sm font-medium text-slate-500">Učitavanje tendera...</p>
              </div>
            }
          >
            <TendersContent
              agencyClientId={agencyClientId}
              companyId={company.id}
              recommendationContext={recommendationContext}
              searchParams={searchParams}
            />
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
}
