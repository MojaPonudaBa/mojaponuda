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
      <div className="rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg mb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-heading font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-yellow-300" />
              Otključajte preporuke tendera
            </h3>
            <p className="text-blue-100 max-w-xl">
              Naš AI može automatski pronalaziti tendere koji odgovaraju vašoj djelatnosti. 
              Popunite profil da biste vidjeli preporuke.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-50"
              >
                Podesi profil
              </Link>
            </div>
          </div>
          <div className="hidden sm:block opacity-20 rotate-12">
            <Sparkles className="size-32" />
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
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="size-5 text-blue-500" />
          Preporučeno za vas
        </h2>
        <Link 
          href="/dashboard/tenders?tab=recommended" 
          className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Prikaži sve
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tenders.map((tender) => (
          <Link 
            key={tender.id} 
            href={`/dashboard/tenders/${tender.id}`}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
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

            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Briefcase className="size-3.5" />
                <span>Rok: {new Date(tender.deadline!).toLocaleDateString("bs-BA")}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
