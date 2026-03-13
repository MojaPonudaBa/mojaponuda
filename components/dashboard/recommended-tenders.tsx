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
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-xl font-heading font-bold text-slate-950">
              <Sparkles className="size-5 text-blue-600" />
              Otključajte preporuke tendera
            </h3>
            <p className="max-w-xl text-slate-600">
              Naš AI može automatski pronalaziti tendere koji odgovaraju vašoj djelatnosti. 
              Popunite profil da biste vidjeli preporuke.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.7)] transition-all hover:bg-blue-700"
              >
                Podesi profil
              </Link>
            </div>
          </div>
          <div className="hidden rounded-3xl bg-blue-50 p-5 text-blue-200 sm:block">
            <Sparkles className="size-16" />
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
    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.18)]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-heading font-bold text-slate-950">
            <Sparkles className="size-5 text-blue-600" />
            Preporučeno za vas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tenderi koji odgovaraju vašem profilu i operativnim regijama.
          </p>
        </div>
        <Link 
          href="/dashboard/tenders?tab=recommended" 
          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
        >
          Prikaži sve
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
        {tenders.map((tender) => (
          <Link 
            key={tender.id} 
            href={`/dashboard/tenders/${tender.id}`}
            className="group relative flex min-h-[220px] flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-slate-50/60 p-5 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_20px_35px_-25px_rgba(37,99,235,0.25)]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Preporuka
                </span>
                {tender.estimated_value && (
                  <span className="text-sm font-bold text-emerald-600">
                    {new Intl.NumberFormat("bs-BA", {
                      compactDisplay: "short",
                      notation: "compact",
                      style: "currency",
                      currency: "BAM"
                    }).format(tender.estimated_value)}
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                  {tender.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                  {tender.contracting_authority}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200/70 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
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
