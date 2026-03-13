import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
    .select("keywords, operating_regions")
    .eq("user_id", user.id)
    .single();

  if (!company || !company.keywords || company.keywords.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
              <Sparkles className="size-5 text-blue-600" />
              Otključajte preporuke tendera
            </h3>
            <p className="max-w-lg text-sm text-slate-600">
              Naš AI može automatski pronalaziti tendere koji odgovaraju vašoj djelatnosti. 
              Popunite profil da biste vidjeli preporuke.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/settings"
                className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              >
                Podesi profil
              </Link>
            </div>
          </div>
          <div className="hidden rounded-xl bg-blue-50 p-4 text-blue-300 sm:block">
            <Sparkles className="size-10" />
          </div>
        </div>
      </div>
    );
  }

  // Find matching tenders
  let query = supabase
    .from("tenders")
    .select("id, title, deadline, estimated_value, contracting_authority")
    .gt("deadline", new Date().toISOString());

  // Construct OR filter for keywords
  const keywordConditions = company.keywords
    .map((kw) => `title.ilike.%${kw}%,raw_description.ilike.%${kw}%`)
    .join(",");

  if (keywordConditions) {
    query = query.or(keywordConditions);
  } else {
    return null;
  }

  // If company has specified regions, also filter by those regions
  const regions = company.operating_regions || [];
  if (regions.length > 0) {
    const regionConditions = regions
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
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900">
          <Sparkles className="size-5 text-blue-600" />
          Preporučeno za vas
        </h2>
        <Link 
          href="/dashboard/tenders?tab=recommended" 
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
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
            className="group flex flex-col rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                Preporuka
              </span>
              {tender.estimated_value && (
                <span className="text-sm font-semibold text-emerald-600">
                  {new Intl.NumberFormat("bs-BA", {
                    compactDisplay: "short",
                    notation: "compact",
                    style: "currency",
                    currency: "BAM"
                  }).format(tender.estimated_value)}
                </span>
              )}
            </div>
            
            <h3 className="mb-1 font-medium text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600">
              {tender.title}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-1">
              {tender.contracting_authority}
            </p>

            <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-slate-500">
              <Briefcase className="size-3.5" />
              <span>Rok: {new Date(tender.deadline!).toLocaleDateString("bs-BA")}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
