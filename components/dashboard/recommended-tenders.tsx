import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileOptionLabel } from "@/lib/company-profile";
import { formatCurrencyKM } from "@/lib/currency";
import { maybeRerankTenderRecommendationsWithAI } from "@/lib/tender-recommendation-rerank";
import {
  buildRecommendationContext,
  buildRecommendationSearchCondition,
  rankTenderRecommendations,
} from "@/lib/tender-recommendations";
import { Sparkles, ArrowRight, Briefcase } from "lucide-react";

interface RecommendationCardTender {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  contracting_authority_jib: string | null;
  contract_type: string | null;
  raw_description: string | null;
  cpv_code: string | null;
  authority_city?: string | null;
  authority_municipality?: string | null;
  authority_canton?: string | null;
  authority_entity?: string | null;
}

export async function RecommendedTenders() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get company keywords and regions
  const { data: company } = await supabase
    .from("companies")
    .select("industry, keywords, cpv_codes, operating_regions")
    .eq("user_id", user.id)
    .single();

  const recommendationContext = company ? buildRecommendationContext(company) : null;
  const searchCondition = recommendationContext
    ? buildRecommendationSearchCondition(recommendationContext)
    : "";
  const hasRecommendationSignals = recommendationContext
    ? recommendationContext.keywords.length > 0 ||
      recommendationContext.cpvPrefixes.length > 0 ||
      recommendationContext.preferredContractTypes.length > 0 ||
      recommendationContext.regionTerms.length > 0
    : false;
  const focusLabel = recommendationContext?.profile.primaryIndustry
    ? getProfileOptionLabel(recommendationContext.profile.primaryIndustry)
    : null;
  const preferredLabels = recommendationContext?.profile.preferredTenderTypes.map((item) => getProfileOptionLabel(item)) ?? [];
  const regionLabels = recommendationContext?.regionLabels ?? [];

  if (!company || !recommendationContext || !hasRecommendationSignals) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1">
              <Sparkles className="size-5 text-blue-600" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Pametne preporuke</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-slate-950">
              Postavite profil i dobijte tendera koji imaju smisla za vašu firmu
            </h3>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Kada znamo šta nudite i gdje radite, izdvajamo tendera koji liče na vaš posao i smanjujemo buku od nerelevantnih objava.
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

  const resolvedRecommendationContext = recommendationContext;

  // Find matching tenders
  let query = supabase
    .from("tenders")
    .select("id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code")
    .gt("deadline", new Date().toISOString());

  if (
    resolvedRecommendationContext.preferredContractTypes.length > 0 &&
    resolvedRecommendationContext.preferredContractTypes.length < 3
  ) {
    query = query.in("contract_type", resolvedRecommendationContext.preferredContractTypes);
  }

  if (searchCondition) {
    query = query.or(searchCondition);
  }

  const { data } = await query
    .order("deadline", { ascending: true })
    .limit(72);

  const authorityJibs = [...new Set(((data ?? []) as RecommendationCardTender[])
    .map((tender) => tender.contracting_authority_jib)
    .filter(Boolean) as string[])];
  const { data: authorityRows } = authorityJibs.length > 0
    ? await supabase
        .from("contracting_authorities")
        .select("jib, city, municipality, canton, entity")
        .in("jib", authorityJibs)
    : { data: [] };

  const authorityMap = new Map(
    (authorityRows ?? []).map((authority) => [authority.jib, authority])
  );

  const scopedTenders = ((data ?? []) as RecommendationCardTender[]).map((tender) => {
    const authority = tender.contracting_authority_jib
      ? authorityMap.get(tender.contracting_authority_jib)
      : null;

    return {
      ...tender,
      authority_city: authority?.city ?? null,
      authority_municipality: authority?.municipality ?? null,
      authority_canton: authority?.canton ?? null,
      authority_entity: authority?.entity ?? null,
    };
  });

  const rankedTenders = rankTenderRecommendations(
    scopedTenders,
    resolvedRecommendationContext
  );

  const tenders = await maybeRerankTenderRecommendationsWithAI(
    rankedTenders,
    resolvedRecommendationContext,
    {
      limit: 3,
      shortlistSize: 6,
    }
  );

  if (tenders.length === 0) return null;

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
              Tenderi koji najviše liče na ono što radite i gdje realno možete izvršiti ugovor.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {focusLabel ? (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  Fokus: {focusLabel}
                </span>
              ) : null}
              {preferredLabels.slice(0, 2).map((label) => (
                <span key={label} className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Tip: {label}
                </span>
              ))}
              {(regionLabels.length > 0 ? regionLabels : ["Cijela BiH"]).slice(0, 2).map((label) => (
                <span key={label} className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                  Regija: {label}
                </span>
              ))}
            </div>
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
        {tenders.map(({ tender, reasons }) => (
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
                  {formatCurrencyKM(tender.estimated_value)}
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
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Zašto odgovara: {reasons[0] ?? "Poklapa se s vašim profilom."}
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
