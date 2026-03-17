import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tender } from "@/types/database";
import {
  buildProfileKeywordSeeds,
  parseCompanyProfile,
  sanitizeSearchKeywords,
} from "@/lib/company-profile";
import { buildRegionSearchTerms } from "@/lib/constants/regions";
import { TenderFilters } from "@/components/tenders/tender-filters";
import { TenderCard } from "@/components/tenders/tender-card";
import { Pagination } from "@/components/tenders/pagination";
import { Search, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

interface TendersPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function TendersContent({ searchParams }: TendersPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const activeTab = params.tab === "all" ? "all" : "recommended";

  // Get current user and company for recommendations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let companyKeywords: string[] = [];
  let companyRegions: string[] = [];
  let hasProfile = false;

  if (activeTab === "recommended" && user) {
    const { data: company } = await supabase
      .from("companies")
      .select("industry, keywords, operating_regions")
      .eq("user_id", user.id)
      .single();

    if (company) {
      const companyProfile = parseCompanyProfile(company.industry);
      hasProfile = true;
      companyKeywords = sanitizeSearchKeywords([
        ...(company.keywords || []),
        ...buildProfileKeywordSeeds(companyProfile),
      ]);
      companyRegions = buildRegionSearchTerms(company.operating_regions || []);
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

    if (!hasProfile || companyKeywords.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Podesite svoj profil
          </h3>
          <p className="mb-6 max-w-md text-slate-500">
            Da bismo vam mogli preporučiti tendere, trebamo znati šta tačno nudite
            i gdje radite. Dopunite profil firme.
          </p>
          <Button asChild>
            <Link href="/dashboard/settings">Uredi Profil</Link>
          </Button>
        </div>
      );
    }
  }

  const hasFilters =
    params.q ||
    (params.contract_type && params.contract_type !== "all") ||
    (params.procedure_type && params.procedure_type !== "all") ||
    params.deadline_from ||
    params.deadline_to ||
    params.value_min ||
    params.value_max;

  // Build query
  let query = supabase
    .from("tenders")
    .select("*", { count: "exact" })
    .gt("deadline", new Date().toISOString());

  // Apply recommendation filter
  if (activeTab === "recommended" && companyKeywords.length > 0) {
    // Construct OR filter for keywords in title or description
    const keywordConditions = companyKeywords
      .map((kw) => `title.ilike.%${kw}%,raw_description.ilike.%${kw}%`)
      .join(",");

    if (keywordConditions) {
      query = query.or(keywordConditions);
    }

    // If company has specified regions, also filter by those regions
    if (companyRegions.length > 0) {
      const regionConditions = companyRegions
        .map(
          (reg) =>
            `title.ilike.%${reg}%,raw_description.ilike.%${reg}%,contracting_authority.ilike.%${reg}%`
        )
        .join(",");
      
      if (regionConditions) {
        query = query.or(regionConditions);
      }
    }
  }

  // Keyword filter (search bar overrides recommendations or adds to them)
  if (params.q) {
    const kw = `%${params.q}%`;
    query = query.or(`title.ilike.${kw},raw_description.ilike.${kw}`);
  }

  // Contract type
  if (params.contract_type && params.contract_type !== "all") {
    query = query.ilike("contract_type", `%${params.contract_type}%`);
  }

  // Procedure type
  if (params.procedure_type && params.procedure_type !== "all") {
    query = query.ilike("procedure_type", `%${params.procedure_type}%`);
  }

  // Deadline range
  if (params.deadline_from) {
    query = query.gte("deadline", new Date(params.deadline_from).toISOString());
  }
  if (params.deadline_to) {
    query = query.lte("deadline", new Date(params.deadline_to + "T23:59:59").toISOString());
  }

  // Value range
  if (params.value_min) {
    query = query.gte("estimated_value", parseFloat(params.value_min));
  }
  if (params.value_max) {
    query = query.lte("estimated_value", parseFloat(params.value_max));
  }

  // Order + pagination
  const { data, count } = await query
    .order("deadline", { ascending: false, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const tenders = (data ?? []) as Tender[];
  const totalCount = count ?? 0;
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
              ? "Trenutno nema aktivnih tendera koji odgovaraju vašim ključnim riječima i regijama."
              : hasFilters
              ? "Pokušajte sa drugačijim filterima ili resetujte pretragu."
              : "Podaci se automatski sinhronizuju sa e-Nabavke portala."}
          </p>
          {activeTab === "recommended" && (
            <Button variant="outline" className="mt-6 rounded-sm" asChild>
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
  const activeTab = params.tab === "all" ? "all" : "recommended";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tender Skener
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Pretražite aktivne tendere iz BiH e-Procurement portala.
          </p>
        </div>
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
