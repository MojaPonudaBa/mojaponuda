import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import type { Tender } from "@/types/database";
import { buildRegionSearchTerms } from "@/lib/constants/regions";
import { maybeRerankTenderRecommendationsWithAI } from "@/lib/tender-recommendation-rerank";
import {
  buildRecommendationContext,
  enrichTendersWithAuthorityGeo,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  matchesTenderLocationTerms,
  selectTenderRecommendations,
  type RecommendationContext,
} from "@/lib/tender-recommendations";
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

async function TendersContent({ agencyClientId, companyId, companyName, recommendationContext, searchParams }: {
  agencyClientId: string;
  companyId: string;
  companyName: string;
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
  const locationFilterValues = getMultiParam(params.location);
  const locationFilterTerms = buildRegionSearchTerms(locationFilterValues);

  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const activeTab = tabParam === "all" ? "all" : "recommended";

  const hasFilters =
    keywordParam ||
    (contractTypeParam && contractTypeParam !== "all") ||
    (procedureTypeParam && procedureTypeParam !== "all") ||
    deadlineFromParam ||
    deadlineToParam ||
    locationFilterValues.length > 0;

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
    >(supabase, recommendationContext, { select: "*", limit: 240 });

    const available = candidates.filter((t) => !existingBidTenderIds.has(t.id));
    let ranked = selectTenderRecommendations(available, recommendationContext, { minimumResults: 4 });

    if (keywordParam) {
      const term = keywordParam.toLowerCase();
      ranked = ranked.filter(({ tender }) =>
        [tender.title, tender.raw_description, tender.contracting_authority]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      );
    }

    ranked = await maybeRerankTenderRecommendationsWithAI(ranked, recommendationContext, {
      limit: Math.max(ranked.length, 10),
      shortlistSize: 10,
    });

    if (locationFilterTerms.length > 0) {
      ranked = ranked.filter(({ tender }) => matchesTenderLocationTerms(tender, locationFilterTerms));
    }

    totalCount = ranked.length;
    tenders = ranked.slice(offset, offset + PAGE_SIZE).map(({ tender }) => tender as Tender);
  } else {
    // All tenders tab
    if (locationFilterTerms.length > 0) {
      let locationQuery = supabase
        .from("tenders")
        .select("*")
        .gt("deadline", new Date().toISOString());

      if (keywordParam) {
        const kw = `%${keywordParam}%`;
        locationQuery = locationQuery.or(`title.ilike.${kw},raw_description.ilike.${kw}`);
      }
      if (contractTypeParam !== "all") locationQuery = locationQuery.ilike("contract_type", `%${contractTypeParam}%`);
      if (procedureTypeParam !== "all") locationQuery = locationQuery.ilike("procedure_type", `%${procedureTypeParam}%`);
      if (deadlineFromParam) locationQuery = locationQuery.gte("deadline", new Date(deadlineFromParam).toISOString());
      if (deadlineToParam) locationQuery = locationQuery.lte("deadline", new Date(`${deadlineToParam}T23:59:59`).toISOString());

      const { data } = await locationQuery
        .order("deadline", { ascending: false, nullsFirst: false })
        .range(0, 2499);

      const enriched = await enrichTendersWithAuthorityGeo(
        supabase,
        (data ?? []) as Array<Tender & { authority_city: string | null; authority_municipality: string | null; authority_canton: string | null; authority_entity: string | null }>
      );
      const filtered = enriched.filter((t) => matchesTenderLocationTerms(t, locationFilterTerms));
      totalCount = filtered.length;
      tenders = filtered.slice(offset, offset + PAGE_SIZE).map((t) => t as Tender);
    } else {
      let query = supabase
        .from("tenders")
        .select("*", { count: "exact" })
        .gt("deadline", new Date().toISOString());

      if (keywordParam) {
        const kw = `%${keywordParam}%`;
        query = query.or(`title.ilike.${kw},raw_description.ilike.${kw}`);
      }
      if (contractTypeParam !== "all") query = query.ilike("contract_type", `%${contractTypeParam}%`);
      if (procedureTypeParam !== "all") query = query.ilike("procedure_type", `%${procedureTypeParam}%`);
      if (deadlineFromParam) query = query.gte("deadline", new Date(deadlineFromParam).toISOString());
      if (deadlineToParam) query = query.lte("deadline", new Date(`${deadlineToParam}T23:59:59`).toISOString());

      const { data, count } = await query
        .order("deadline", { ascending: false, nullsFirst: false })
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
            <TenderCard key={tender.id} tender={tender} />
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

  const recommendationContext = buildRecommendationContext({
    industry: company.industry,
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
            Da bi sistem mogao preporučiti tendere, profil klijenta mora imati djelatnosti, lokaciju ili opis.
          </p>
          <Button asChild>
            <Link href={`/dashboard/agency/clients/${agencyClientId}`}>Nazad na klijenta</Link>
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
            <Link href={{ pathname: basePath, query: { ...resolvedParams, tab: "recommended", page: "1" } }} className="flex items-center gap-2">
              <Sparkles className="size-3.5" />
              Preporučeno
            </Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href={{ pathname: basePath, query: { ...resolvedParams, tab: "all", page: "1" } }}>
              Svi tenderi
            </Link>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <Suspense fallback={null}>
            <TenderFilters basePath={basePath} />
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
              companyName={company.name}
              recommendationContext={recommendationContext}
              searchParams={searchParams}
            />
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
}
