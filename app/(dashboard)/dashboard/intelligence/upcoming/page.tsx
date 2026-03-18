import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyKM } from "@/lib/currency";
import { demoUpcomingProcurements, isDemoUser } from "@/lib/demo";
import { getMarketOverview } from "@/lib/market-intelligence";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import type { Company } from "@/types/database";
import { Calendar, TrendingUp, CalendarDays, ArrowUpRight } from "lucide-react";

export default async function UpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDemoAccount = isDemoUser(user.email);
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const { data: companyData } = await supabase
    .from("companies")
    .select("jib, industry, keywords, operating_regions")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Pick<Company, "jib" | "industry" | "keywords" | "operating_regions"> | null;
  const marketOverview = await getMarketOverview(supabase, company ?? undefined);

  const upcoming = marketOverview.upcomingPlans.length > 0
    ? marketOverview.upcomingPlans.map((plan) => ({
        id: plan.id,
        portal_id: plan.id,
        description: plan.description,
        estimated_value: plan.estimated_value,
        planned_date: plan.planned_date,
        contract_type: plan.contract_type,
        cpv_code: null,
        contracting_authority_id: null,
        contracting_authorities: plan.contracting_authorities,
      }))
    : [];
  const displayUpcoming = upcoming.length > 0 ? upcoming : isDemoAccount ? demoUpcomingProcurements : [];

  const upcomingValueKnownCount = displayUpcoming.filter(
    (p) => p.estimated_value !== null && p.estimated_value !== undefined
  ).length;
  const totalUpcomingValue = displayUpcoming.reduce(
    (sum, p) =>
      sum +
      (p.estimated_value === null || p.estimated_value === undefined
        ? 0
        : Number(p.estimated_value) || 0),
    0
  );

  return (
    <div className="space-y-8 max-w-[1200px]">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Planirani tenderi</h1>
        <p className="mt-2 text-base text-slate-500">
          Vidite šta dolazi uskoro kako biste ranije planirali dokumente, tim i kapacitete.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {marketOverview.profileScoped
            ? `Pregled je prilagođen na ${marketOverview.matchedCategories.length} kategorija i ${marketOverview.matchedAuthorityCount} naručilaca iz vašeg tržišnog profila.`
            : "Dopunite profil da bi planirani tenderi bili prikazani samo za vaše tržište."}
        </p>
      </div>

      {/* Kartice */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
             <Calendar className="size-24 text-blue-500 transform rotate-12" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Nadolazeći tenderi</p>
            <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <CalendarDays className="size-5" />
            </div>
          </div>
          <p className="text-4xl font-heading font-extrabold text-slate-900">{displayUpcoming.length}</p>
          <p className="mt-1 text-sm text-slate-500 font-medium">Prilike koje dolaze uskoro</p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
             <TrendingUp className="size-24 text-emerald-500 transform -rotate-12" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Procijenjena vrijednost</p>
            <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowUpRight className="size-5" />
            </div>
          </div>
          <p className="text-4xl font-heading font-extrabold text-slate-900">{upcomingValueKnownCount > 0 ? formatCurrencyKM(totalUpcomingValue) : "—"}</p>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            {upcomingValueKnownCount > 0
              ? `Vrijednost objavljena za ${upcomingValueKnownCount} tendera`
              : "Vrijednost još nije objavljena"}
          </p>
        </div>
      </div>

      {/* Nadolazeći */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="font-heading text-lg font-bold text-slate-900">Nadolazeći tenderi</h2>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 pl-4">Tenderi koji ulaze u prostor koji pratite</p>
        </div>
        {displayUpcoming.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Calendar className="size-6" />
            </div>
            <p className="text-sm font-medium text-slate-900">Nema planiranih tendera</p>
            <p className="text-xs text-slate-500 mt-1">Trenutno nema planiranih nabavki u vašem prostoru.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {displayUpcoming.map((p) => (
              <div key={p.id} className="px-6 py-5 hover:bg-slate-50 transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <p className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                      {p.description || "Bez opisa"}
                    </p>
                    {p.contracting_authorities?.name && (
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-slate-300" />
                        {p.contracting_authorities.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                     {p.estimated_value && (
                        <p className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block">
                          {formatCurrencyKM(Number(p.estimated_value))}
                        </p>
                      )}
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {p.planned_date && (
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md font-medium">
                      <Calendar className="size-3.5" />
                      Planirano: {new Date(p.planned_date).toLocaleDateString("bs-BA")}
                    </div>
                  )}
                  {p.contract_type && (
                    <span className="rounded-md border border-slate-200 px-2 py-1 font-medium bg-white">
                      {p.contract_type}
                    </span>
                  )}
                  {p.cpv_code && (
                    <span className="font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      CPV: {p.cpv_code}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
