import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import type { Tender } from "@/types/database";
import { buildRegionSearchTerms } from "@/lib/constants/regions";
import { maybeRerankTenderRecommendationsWithAI } from "@/lib/tender-recommendation-rerank";
import { resolveTenderSort, sortRecommendedTenderItems, sortStandardTenders } from "@/lib/tender-sorting";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  buildRecommendationContext,
  enrichTendersWithAuthorityGeo,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  matchesTenderLocationTerms,
  RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
  RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
  RECOMMENDATION_SUMMARY_CANDIDATE_LIMIT,
  RECOMMENDATION_SUMMARY_MINIMUM_RESULTS,
  selectTenderRecommendations,
  type RecommendationContext,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";
import { TenderFilters } from "@/components/tenders/tender-filters";
import { TenderCard } from "@/components/tenders/tender-card";
import { Pagination } from "@/components/tenders/pagination";
import { MapPinned, Search, Sparkles, Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/subscription/upgrade-button";

const PAGE_SIZE = 20;

type SearchParamValue = string | string[] | undefined;

interface TendersPageProps {
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

async function TendersContent({ searchParams }: TendersPageProps) {
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

  // Get current user and company for recommendations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subscriptionStatus = user ? await getSubscriptionStatus(user.id, user.email, supabase) : null;
  const isLocked = subscriptionStatus?.plan?.id === "basic";
  const isAgency = subscriptionStatus?.plan?.id === "agency";

  // Agency: multi-client recommendation data
  interface AgencyClientCompany {
    agencyClientId: string;
    companyId: string;
    companyName: string;
    industry: string | null;
    keywords: string[] | null;
    cpv_codes: string[] | null;
    operating_regions: string[] | null;
  }
  let agencyClients: AgencyClientCompany[] = [];
  const agencyTenderClientMap = new Map<string, { tender: Tender; clientNames: string[]; score: number; locationPriority: number }>();
  let agencyTotalCount = 0;

  let recommendationContext: RecommendationContext | null = null;
  let hasProfile = false;
  let hasRecommendationSignalsForProfile = false;
  let existingBidTenderIds = new Set<string>();

  if (activeTab === "recommended" && user && isAgency) {
    // Fetch all agency client companies
    const { data: acRows } = await supabase
      .from("agency_clients")
      .select("id, company_id, companies (id, name, industry, keywords, cpv_codes, operating_regions)")
      .eq("agency_user_id", user.id);

    agencyClients = (acRows ?? []).map((row) => {
      const c = row.companies as { id: string; name: string; industry: string | null; keywords: string[] | null; cpv_codes: string[] | null; operating_regions: string[] | null } | null;
      return {
        agencyClientId: row.id,
        companyId: c?.id ?? row.company_id,
        companyName: c?.name ?? "Nepoznat",
        industry: c?.industry ?? null,
        keywords: c?.keywords ?? null,
        cpv_codes: c?.cpv_codes ?? null,
        operating_regions: c?.operating_regions ?? null,
      };
    });

    if (agencyClients.length > 0) {
      hasProfile = true;
      hasRecommendationSignalsForProfile = true;

      // Build recommendation contexts and fetch candidates for each client (parallel)
      const clientResults = await Promise.all(
        agencyClients.map(async (client) => {
          const ctx = buildRecommendationContext({
            industry: client.industry,
            keywords: client.keywords,
            cpv_codes: client.cpv_codes,
            operating_regions: client.operating_regions,
          });
          if (!hasRecommendationSignals(ctx)) return { client, scored: [] };

          const candidates = await fetchRecommendedTenderCandidates<RecommendationTenderInput>(
            supabase, ctx,
            { select: "*", limit: RECOMMENDATION_SUMMARY_CANDIDATE_LIMIT }
          );
          const scored = selectTenderRecommendations(candidates, ctx, {
            minimumResults: RECOMMENDATION_SUMMARY_MINIMUM_RESULTS,
          });
          return { client, scored };
        })
      );

      // Merge: group by tender ID, collect client names, keep best score & location
      const mergedMap = new Map<string, { tender: Tender; clientNames: string[]; score: number; locationPriority: number }>();
      for (const { client, scored } of clientResults) {
        for (const s of scored) {
          const existing = mergedMap.get(s.tender.id);
          if (existing) {
            if (!existing.clientNames.includes(client.companyName)) {
              existing.clientNames.push(client.companyName);
            }
            if (s.score > existing.score) existing.score = s.score;
            if (s.locationPriority < existing.locationPriority) existing.locationPriority = s.locationPriority;
          } else {
            mergedMap.set(s.tender.id, {
              tender: s.tender as unknown as Tender,
              clientNames: [client.companyName],
              score: s.score,
              locationPriority: s.locationPriority,
            });
          }
        }
      }

      const sorted = sortRecommendedTenderItems(
        [...mergedMap.values()].map((item) => ({
          ...item,
          positiveSignalCount: item.score,
        })),
        sortParam
      );

      // Apply keyword filter if present
      let filtered = sorted;
      if (keywordParam) {
        const term = keywordParam.toLowerCase();
        filtered = sorted.filter(({ tender }) =>
          [tender.title, tender.raw_description, tender.contracting_authority]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(term))
        );
      }

      if (locationFilterTerms.length > 0) {
        filtered = filtered.filter(({ tender }) =>
          matchesTenderLocationTerms(tender as RecommendationTenderInput, locationFilterTerms)
        );
      }

      agencyTotalCount = filtered.length;
      // Store paginated results for rendering
      for (const item of filtered.slice(offset, offset + PAGE_SIZE)) {
        agencyTenderClientMap.set(item.tender.id, item);
      }

      // Use first client's context as fallback for the outer page shell
      recommendationContext = buildRecommendationContext({
        industry: agencyClients[0].industry,
        keywords: agencyClients[0].keywords,
        cpv_codes: agencyClients[0].cpv_codes,
        operating_regions: agencyClients[0].operating_regions,
      });
    }
  } else if (activeTab === "recommended" && user) {
    const { data: company } = await supabase
      .from("companies")
      .select("id, industry, keywords, cpv_codes, operating_regions")
      .eq("user_id", user.id)
      .single();

    if (company) {
      hasProfile = true;
      recommendationContext = buildRecommendationContext(company);
      hasRecommendationSignalsForProfile = hasRecommendationSignals(recommendationContext);

      const { data: bidRows } = await supabase
        .from("bids")
        .select("tender_id")
        .eq("company_id", company.id);

      existingBidTenderIds = new Set(
        (bidRows ?? [])
          .map((row) => row.tender_id)
          .filter((value): value is string => Boolean(value))
      );
    }
  }

  // If tab is recommended but no keywords/profile, show empty state immediately
  if (activeTab === "recommended") {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Prijavite se za preporuke
          </h3>
          <p className="mb-6 max-w-md text-slate-500">
            Prijavite se da bismo mogli analizirati vaš profil i preporučiti vam
            najbolje tendere.
          </p>
          <Button asChild>
            <Link href="/login">Prijavi se</Link>
          </Button>
        </div>
      );
    }

    if (!isAgency && (!hasProfile || !recommendationContext || !hasRecommendationSignalsForProfile)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Podesite svoj profil
          </h3>
          <p className="mb-6 max-w-md text-slate-500">
            Da bismo izdvojili tendera koji stvarno imaju smisla za vašu firmu, trebamo znati šta nudite i gdje se firma nalazi. Dopunite profil firme.
          </p>
          <Button asChild>
            <Link href="/dashboard/settings">Uredi Profil</Link>
          </Button>
        </div>
      );
    }

    if (isAgency && agencyClients.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Dodajte klijente
          </h3>
          <p className="mb-6 max-w-md text-slate-500">
            Dodajte klijente u svoj agencijski panel da biste vidjeli preporučene tendere za svaku firmu koju vodite.
          </p>
          <Button asChild>
            <Link href="/dashboard/agency">Idi na klijente</Link>
          </Button>
        </div>
      );
    }
  }

  const hasFilters =
    keywordParam ||
    (contractTypeParam && contractTypeParam !== "all") ||
    (procedureTypeParam && procedureTypeParam !== "all") ||
    deadlineFromParam ||
    deadlineToParam ||
    valueMinParam ||
    valueMaxParam ||
    locationFilterValues.length > 0 ||
    (activeTab === "recommended" ? sortParam !== "recommended" : sortParam !== "deadline_asc");

  let tenders: Tender[] = [];
  let totalCount = 0;

  if (activeTab === "recommended" && isAgency) {
    // Agency: multi-client recommendations already computed above
    totalCount = agencyTotalCount;
    tenders = [...agencyTenderClientMap.values()]
      .map(({ tender }) => tender);
  } else if (activeTab === "recommended" && recommendationContext) {
    const scopedRecommendationRows = await fetchRecommendedTenderCandidates<
      Tender & {
        authority_city: string | null;
        authority_municipality: string | null;
        authority_canton: string | null;
        authority_entity: string | null;
      }
    >(supabase, recommendationContext, {
      select: "*",
      limit: RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
    });

    const availableRecommendationRows = scopedRecommendationRows.filter(
      (tender) => !existingBidTenderIds.has(tender.id)
    );
    let rankedRecommendations = selectTenderRecommendations(
      availableRecommendationRows,
      recommendationContext,
      {
        minimumResults: RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
      }
    );

    if (keywordParam) {
      const searchTerm = keywordParam.toLowerCase();
      rankedRecommendations = rankedRecommendations.filter(({ tender }) =>
        [tender.title, tender.raw_description, tender.contracting_authority]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm))
      );
    }

    rankedRecommendations = await maybeRerankTenderRecommendationsWithAI(
      rankedRecommendations,
      recommendationContext,
      {
        limit: Math.max(rankedRecommendations.length, 10),
        shortlistSize: 10,
      }
    );

    rankedRecommendations = sortRecommendedTenderItems(rankedRecommendations, sortParam);

    if (locationFilterTerms.length > 0) {
      rankedRecommendations = rankedRecommendations.filter(({ tender }) =>
        matchesTenderLocationTerms(tender, locationFilterTerms)
      );
    }

    totalCount = rankedRecommendations.length;
    tenders = rankedRecommendations
      .slice(offset, offset + PAGE_SIZE)
      .map(({ tender }) => tender as Tender);
  } else {
    if (locationFilterTerms.length > 0) {
      let locationQuery = supabase
        .from("tenders")
        .select("*");

      if (keywordParam) {
        const kw = `%${keywordParam}%`;
        locationQuery = locationQuery.or(`title.ilike.${kw},raw_description.ilike.${kw}`);
      }

      if (contractTypeParam !== "all") {
        locationQuery = locationQuery.ilike("contract_type", `%${contractTypeParam}%`);
      }

      if (procedureTypeParam !== "all") {
        locationQuery = locationQuery.ilike("procedure_type", `%${procedureTypeParam}%`);
      }

      if (deadlineFromParam) {
        locationQuery = locationQuery.gte("deadline", new Date(deadlineFromParam).toISOString());
      }
      if (deadlineToParam) {
        locationQuery = locationQuery.lte("deadline", new Date(`${deadlineToParam}T23:59:59`).toISOString());
      }

      if (valueMinParam) {
        locationQuery = locationQuery.gte("estimated_value", parseFloat(valueMinParam));
      }
      if (valueMaxParam) {
        locationQuery = locationQuery.lte("estimated_value", parseFloat(valueMaxParam));
      }

      const { data } = await locationQuery
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
        .range(0, 2499);

      const enrichedRows = await enrichTendersWithAuthorityGeo(
        supabase,
        ((data ?? []) as Array<
          Tender & {
            authority_city: string | null;
            authority_municipality: string | null;
            authority_canton: string | null;
            authority_entity: string | null;
          }
        >)
      );
      const filteredRows = enrichedRows.filter((tender) =>
        matchesTenderLocationTerms(tender, locationFilterTerms)
      );

      const sortedRows = sortStandardTenders(filteredRows, sortParam);
      totalCount = sortedRows.length;
      tenders = sortedRows.slice(offset, offset + PAGE_SIZE).map((tender) => tender as Tender);
    } else {
      let query = supabase
        .from("tenders")
        .select("*", { count: "exact" });

      if (keywordParam) {
        const kw = `%${keywordParam}%`;
        query = query.or(`title.ilike.${kw},raw_description.ilike.${kw}`);
      }

      if (contractTypeParam !== "all") {
        query = query.ilike("contract_type", `%${contractTypeParam}%`);
      }

      if (procedureTypeParam !== "all") {
        query = query.ilike("procedure_type", `%${procedureTypeParam}%`);
      }

      if (deadlineFromParam) {
        query = query.gte("deadline", new Date(deadlineFromParam).toISOString());
      }
      if (deadlineToParam) {
        query = query.lte("deadline", new Date(`${deadlineToParam}T23:59:59`).toISOString());
      }

      if (valueMinParam) {
        query = query.gte("estimated_value", parseFloat(valueMinParam));
      }
      if (valueMaxParam) {
        query = query.lte("estimated_value", parseFloat(valueMaxParam));
      }

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
              ? "Trenutno nema aktivnih tendera koji se dovoljno jasno poklapaju s vašim profilom, tipom tendera i lokacijom firme."
              : hasFilters
              ? "Pokušajte sa drugačijim filterima ili resetujte pretragu."
              : "Podaci se automatski sinhronizuju sa e-Nabavke portala."}
          </p>
          {activeTab === "recommended" && (
            <Button className="mt-6 rounded-xl bg-slate-950 px-5 text-white shadow-[0_16px_35px_-20px_rgba(15,23,42,0.6)] transition-all hover:bg-slate-800" asChild>
               <Link href="/dashboard/settings">Ažuriraj Profil</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {isLocked && tenders.length > 0 && (
             <div className="mb-6 rounded-[1.5rem] bg-[linear-gradient(110deg,#1e1b4b_0%,#0f172a_100%)] p-6 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <Lock className="size-5 text-blue-400" />
                      Ovo je samo pregled dostupnih prilika
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                      Pronašli smo stvarne prilike za vas. Međutim, kao korisnik Besplatnog naloga možete vidjeti samo signale da ponude postoje.
                    </p>
                  </div>
                  <UpgradeButton 
                    eventName="CLICK_UPGRADE_FEED" 
                    metadata={{ tab: activeTab }}
                    className="shrink-0 whitespace-nowrap bg-blue-600 text-white rounded-xl font-semibold h-11 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  >
                    Otključaj tendere za vašu firmu
                  </UpgradeButton>
                </div>
             </div>
          )}

          {tenders.map((tender) => (
            <TenderCard
              key={tender.id}
              tender={tender}
              locked={isLocked}
              clientNames={agencyTenderClientMap.get(tender.id)?.clientNames}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/dashboard/tenders"
        />
      </div>
    </>
  );
}

export default async function TendersPage(props: TendersPageProps) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subscriptionStatus = user ? await getSubscriptionStatus(user.id, user.email, supabase) : null;
  const isLocked = subscriptionStatus?.plan?.id === "basic";
  const isAgencyOuter = subscriptionStatus?.plan?.id === "agency";

  const activeTabOrigin = getSingleParam(params.tab) === "all" ? "all" : "recommended";
  const activeTab = isLocked ? "recommended" : activeTabOrigin;
  const showGeoReport = isAdminEmail(user?.email);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tenderi i preporuke
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            {isAgencyOuter
              ? "Preporučeni tenderi za sve klijente koje vodite, sa oznakom za kojeg klijenta je svaki tender."
              : "Pregledajte sve aktivne tendere ili otvorite one koji se najbolje uklapaju u vaš profil i lokaciju firme."}
          </p>
        </div>
        {showGeoReport ? (
          <Button variant="outline" asChild>
            <Link href="/dashboard/tenders/geo-report">
              <MapPinned className="size-4" />
              Geo izvještaj
            </Link>
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className={`grid w-full lg:w-[400px] ${isLocked ? "grid-cols-1" : "grid-cols-2"}`}>
          <TabsTrigger value="recommended" asChild>
            <Link
              href={{ query: { ...params, tab: "recommended", page: "1" } }}
              className="flex items-center gap-2"
            >
              <Sparkles className="size-3.5" />
              Preporučeno
            </Link>
          </TabsTrigger>
          {!isLocked && (
            <TabsTrigger value="all" asChild>
              <Link href={{ query: { ...params, tab: "all", page: "1" } }}>
                Svi tenderi
              </Link>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-6">
          {!isLocked && (
            <Suspense fallback={null}>
              <TenderFilters key={`filters-${activeTab}-${JSON.stringify(params)}`} />
            </Suspense>
          )}

          <Suspense
            key={activeTab + JSON.stringify(params)}
            fallback={
              <div className="flex flex-col items-center justify-center py-24">
                <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary mb-4" />
                <p className="text-sm font-medium text-slate-500">
                  Učitavanje tendera...
                </p>
              </div>
            }
          >
            <TendersContent searchParams={props.searchParams} />
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
}
