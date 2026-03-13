import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { Calendar, TrendingUp, CalendarDays, ArrowUpRight } from "lucide-react";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

export default async function UpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id);
  if (!isSubscribed) return <ProGate />;

  const today = new Date().toISOString().split("T")[0];

  // Planirani tenderi — budući ili nedavni (zadnjih 30 dana)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: planned } = await supabase
    .from("planned_procurements")
    .select("id, portal_id, description, estimated_value, planned_date, contract_type, cpv_code, contracting_authority_id, contracting_authorities(name, jib)")
    .gte("planned_date", thirtyDaysAgo)
    .order("planned_date", { ascending: true })
    .limit(100);

  interface PlannedRow {
    id: string;
    portal_id: string;
    description: string | null;
    estimated_value: number | null;
    planned_date: string | null;
    contract_type: string | null;
    cpv_code: string | null;
    contracting_authority_id: string | null;
    contracting_authorities: { name: string; jib: string } | null;
  }

  const items = (planned ?? []) as unknown as PlannedRow[];

  const upcoming = items.filter((p) => p.planned_date && p.planned_date >= today);
  const recent = items.filter((p) => p.planned_date && p.planned_date < today);

  const totalUpcomingValue = upcoming.reduce(
    (sum, p) => sum + (Number(p.estimated_value) || 0),
    0
  );

  return (
    <div className="space-y-8 max-w-[1200px]">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Planirani tenderi</h1>
        <p className="mt-2 text-base text-slate-500">
          Budite korak ispred konkurencije. Pregled nabavki prije zvanične objave.
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
          <p className="text-4xl font-heading font-extrabold text-slate-900">{upcoming.length}</p>
          <p className="mt-1 text-sm text-slate-500 font-medium">Planirani za budućnost</p>
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
          <p className="text-4xl font-heading font-extrabold text-slate-900">{formatKM(totalUpcomingValue)}</p>
          <p className="mt-1 text-sm text-slate-500 font-medium">Potencijalni prihodi</p>
        </div>
      </div>

      {/* Nadolazeći */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="font-heading text-lg font-bold text-slate-900">Nadolazeći</h2>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 pl-4">Planirani tenderi koji još nisu raspisani</p>
        </div>
        {upcoming.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Calendar className="size-6" />
            </div>
            <p className="text-sm font-medium text-slate-900">Nema planiranih tendera</p>
            <p className="text-xs text-slate-500 mt-1">Trenutno nema podataka o budućim nabavkama.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {upcoming.map((p) => (
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
                          {formatKM(Number(p.estimated_value))}
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

      {/* Nedavno planirani (možda već raspisani) */}
      {recent.length > 0 && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
          <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
            <h2 className="font-heading text-lg font-bold text-slate-700">Nedavno planirani</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Tenderi planirani u zadnjih 30 dana — velika vjerovatnoća da su već raspisani
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.map((p) => (
              <div key={p.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between gap-4">
                  <p className="text-sm font-bold text-slate-700 line-clamp-1">
                    {p.description || "Bez opisa"}
                  </p>
                  {p.estimated_value && (
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {formatKM(Number(p.estimated_value))}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>{p.contracting_authorities?.name}</span>
                  <span>•</span>
                  <span>{new Date(p.planned_date!).toLocaleDateString("bs-BA")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
