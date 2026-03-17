import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  buildProfileKeywordSeeds,
  getPreferredContractTypes,
  parseCompanyProfile,
  sanitizeSearchKeywords,
} from "@/lib/company-profile";
import { buildRegionSearchTerms } from "@/lib/constants/regions";
import { Sparkles, ArrowRight, Briefcase } from "lucide-react";
import type { Tender } from "@/types/database";

export async function RecommendedTenders() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get company keywords and regions
  const { data: company } = await supabase
    .from("companies")
    .select("industry, keywords, operating_regions")
    .eq("user_id", user.id)
    .single();

  const profile = parseCompanyProfile(company?.industry);
  const preferredContractTypes = getPreferredContractTypes(
    profile.preferredTenderTypes
  );
  const searchTerms = [
    ...sanitizeSearchKeywords([
      ...(company?.keywords || []),
      ...buildProfileKeywordSeeds(profile),
    ]),
  ];

  if (!company || searchTerms.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1">
              <Sparkles className="size-5 text-blue-600" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Pametne preporuke</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-slate-950">
              Otključajte personalizirane preporuke tendera
            </h3>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Naš AI može automatski pronalaziti tendere koji odgovaraju vašoj djelatnosti. 
              Popunite profil da biste vidjeli preporuke.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/settings"
                className="inline-flex h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-700"
              >
                Podesi profil
              </Link>
            </div>
          </div>
          <div className="hidden rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-5 text-blue-300 sm:block">
            <Sparkles className="size-12" />
          </div>
        </div>
      </section>
    );
  }

  // Find matching tenders
  let query = supabase
    .from("tenders")
    .select("id, title, deadline, estimated_value, contracting_authority")
    .gt("deadline", new Date().toISOString());

  if (preferredContractTypes.length > 0 && preferredContractTypes.length < 3) {
    query = query.in("contract_type", preferredContractTypes);
  }

  // Construct OR filter for keywords
  const keywordConditions = searchTerms
    .map((kw) => `title.ilike.%${kw}%,raw_description.ilike.%${kw}%`)
    .join(",");

  if (keywordConditions) {
    query = query.or(keywordConditions);
  } else {
    return null;
  }

  // If company has specified regions, also filter by those regions
  const regionSearchTerms = buildRegionSearchTerms(company.operating_regions || []);
  if (regionSearchTerms.length > 0) {
    const regionConditions = regionSearchTerms
      .map(
        (reg) =>
          `title.ilike.%${reg}%,raw_description.ilike.%${reg}%,contracting_authority.ilike.%${reg}%`
      )
      .join(",");
    
    if (regionConditions) {
      query = query.or(regionConditions);
    }
  }

  const { data: tenders } = await query
    .order("deadline", { ascending: true })
    .limit(3);

  if (!tenders || tenders.length === 0) return null;

  return (
    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.18)]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1">
            <Sparkles className="size-4 text-blue-600" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Preporuke</span>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-950">Preporučeno za vas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tenderi koji najbolje odgovaraju vašoj firmi.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/tenders?tab=recommended"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
        >
          Prikaži sve
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenders.map((tender) => (
          <Link
            key={tender.id}
            href={`/dashboard/tenders/${tender.id}`}
            className="group flex min-h-[220px] flex-col rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_40px_-28px_rgba(37,99,235,0.28)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                Preporuka
              </span>
              {tender.estimated_value && (
                <span className="text-sm font-semibold text-emerald-700">
                  {new Intl.NumberFormat("bs-BA", {
                    compactDisplay: "short",
                    notation: "compact",
                    style: "currency",
                    currency: "BAM"
                  }).format(tender.estimated_value)}
                </span>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <h3 className="line-clamp-3 font-semibold leading-6 text-slate-950 transition-colors group-hover:text-blue-700">
                {tender.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                {tender.contracting_authority}
              </p>

              <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                <Briefcase className="size-3.5" />
                <span>Rok: {new Date(tender.deadline!).toLocaleDateString("bs-BA")}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
