import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
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
import { MapPinned, Search, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
  const valueMinParam = "";
  const valueMaxParam = "";
  const locationFilterValues = getMultiParam(params.location);
  const locationFilterTerms = buildRegionSearchTerms(locationFilterValues);

  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const activeTab = tabParam === "all" ? "all" : "recommended";

  // Get current user and company for recommendations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recommendationContext: RecommendationContext | null = null;
  let hasProfile = false;
  let hasRecommendationSignalsForProfile = false;
  let existingBidTenderIds = new Set<string>();

  if (activeTab === "recommended" && user) {
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

    if (!hasProfile || !recommendationContext || !hasRecommendationSignalsForProfile) {
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
  }

  const hasFilters =
    keywordParam ||
    (contractTypeParam && contractTypeParam !== "all") ||
    (procedureTypeParam && procedureTypeParam !== "all") ||
    deadlineFromParam ||
    deadlineToParam ||
    valueMinParam ||
    valueMaxParam ||
    locationFilterValues.length > 0;

  let tenders: Tender[] = [];
  let totalCount = 0;

  if (activeTab === "recommended" && recommendationContext) {
    const scopedRecommendationRows = await fetchRecommendedTenderCandidates<
      Tender & {
        authority_city: string | null;
        authority_municipality: string | null;
        authority_canton: string | null;
        authority_entity: string | null;
      }
    >(supabase, recommendationContext, {
      select: "*",
      limit: 240,
    });

    const availableRecommendationRows = scopedRecommendationRows.filter(
      (tender) => !existingBidTenderIds.has(tender.id)
    );
    let rankedRecommendations = selectTenderRecommendations(
      availableRecommendationRows,
      recommendationContext,
      {
        minimumResults: 10,
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
        .select("*")
        .gt("deadline", new Date().toISOString());

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
        .order("deadline", { ascending: false, nullsFirst: false })
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

      totalCount = filteredRows.length;
      tenders = filteredRows.slice(offset, offset + PAGE_SIZE).map((tender) => tender as Tender);
    } else {
      let query = supabase
        .from("tenders")
        .select("*", { count: "exact" })
        .gt("deadline", new Date().toISOString());

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
        .order("deadline", { ascending: false, nullsFirst: false })
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
          {tenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender} />
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
  const activeTab = getSingleParam(params.tab) === "all" ? "all" : "recommended";
  const showGeoReport = isAdminEmail(user?.email);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tenderi i preporuke
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Pregledajte sve aktivne tendere ili otvorite one koji se najbolje uklapaju u vaš profil i lokaciju firme.
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
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="recommended" asChild>
            <Link
              href={{ query: { ...params, tab: "recommended", page: "1" } }}
              className="flex items-center gap-2"
            >
              <Sparkles className="size-3.5" />
              Preporučeno
            </Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href={{ query: { ...params, tab: "all", page: "1" } }}>
              Svi tenderi
            </Link>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <Suspense fallback={null}>
            <TenderFilters />
          </Suspense>

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
