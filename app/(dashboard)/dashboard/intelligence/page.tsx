import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoTopAuthorities, demoTopWinners, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { CategoryChart } from "@/components/intelligence/category-chart";
import { TrendingUp, FileText, BarChart3, Database, Building2, Trophy, ArrowUpRight } from "lucide-react";
import Link from "next/link";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

export default async function IntelligencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDemoAccount = isDemoUser(user.email);
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

  // Aktivni tenderi
  const { count: activeCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gte("deadline", now.toISOString());

  // Ukupna godišnja vrijednost dodijeljenih ugovora
  const { data: yearAwards } = await supabase
    .from("award_decisions")
    .select("winning_price, contract_type")
    .gte("award_date", startOfYear)
    .not("winning_price", "is", null);

  const yearTotalValue = (yearAwards ?? []).reduce(
    (sum, a) => sum + (Number(a.winning_price) || 0),
    0
  );

  // Tenderi po kategoriji
  const categoryMap = new Map<string, { category: string; count: number; total_value: number }>();
  for (const a of yearAwards ?? []) {
    const cat = a.contract_type ?? "Ostalo";
    const existing = categoryMap.get(cat);
    const price = Number(a.winning_price) || 0;
    if (existing) {
      existing.count++;
      existing.total_value += price;
    } else {
      categoryMap.set(cat, { category: cat, count: 1, total_value: price });
    }
  }
  const categoryData = [...categoryMap.values()].sort((a, b) => b.count - a.count);
  const displayCategoryData = categoryData.length > 0
    ? categoryData
    : isDemoAccount
      ? [
          { category: "Robe", count: 8, total_value: 420000 },
          { category: "Usluge", count: 5, total_value: 275000 },
          { category: "Softver", count: 3, total_value: 180000 },
        ]
      : [];

  // Top 10 naručilaca ovog mjeseca
  const { data: monthTenders } = await supabase
    .from("tenders")
    .select("contracting_authority, contracting_authority_jib")
    .gte("created_at", startOfMonth)
    .not("contracting_authority", "is", null);

  const authMap = new Map<string, { name: string; jib: string | null; count: number }>();
  for (const t of monthTenders ?? []) {
    const key = t.contracting_authority!;
    const e = authMap.get(key);
    if (e) e.count++;
    else authMap.set(key, { name: key, jib: t.contracting_authority_jib, count: 1 });
  }
  const topAuthorities = [...authMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // Top 10 pobjednika ove godine
  const winnerMap = new Map<string, { name: string; jib: string; wins: number; total_value: number }>();
  const { data: winnerAwards } = await supabase
    .from("award_decisions")
    .select("winner_name, winner_jib, winning_price")
    .gte("award_date", startOfYear)
    .not("winner_jib", "is", null)
    .not("winning_price", "is", null);

  for (const a of winnerAwards ?? []) {
    const key = a.winner_jib!;
    const e = winnerMap.get(key);
    const price = Number(a.winning_price) || 0;
    if (e) { e.wins++; e.total_value += price; }
    else winnerMap.set(key, { name: a.winner_name ?? key, jib: key, wins: 1, total_value: price });
  }
  const topWinners = [...winnerMap.values()].sort((a, b) => b.total_value - a.total_value).slice(0, 10);
  const displayTopAuthorities = topAuthorities.length > 0 ? topAuthorities : isDemoAccount ? demoTopAuthorities : [];
  const displayTopWinners = topWinners.length > 0 ? topWinners : isDemoAccount ? demoTopWinners : [];

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 items-center rounded-full bg-blue-50 px-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-100">
              Market Intelligence
            </span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tržišna Analitika
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Pregled BiH tržišta javnih nabavki u realnom vremenu.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 inline-block">
            Podaci uživo
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Active Tenders Card */}
        <div className="rounded-[1.5rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-blue-200 group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Aktivni Tenderi</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{activeCount ?? 0}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="size-3" />
              Aktuelno
            </span>
            <p className="text-xs text-slate-500">Otvoren rok za prijavu</p>
          </div>
        </div>

        {/* Annual Volume Card */}
        <div className="rounded-[1.5rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-emerald-200 group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Godišnji Volumen</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{formatKM(yearTotalValue)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              YTD {now.getFullYear()}
            </span>
            <p className="text-xs text-slate-500">Ukupna vrijednost ugovora</p>
          </div>
        </div>

        {/* Coverage Card */}
        <div className="rounded-[1.5rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-purple-200 group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Pokrivenost</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <BarChart3 className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">100%</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              EJN Portal
            </span>
            <p className="text-xs text-slate-500">Svi javni podaci</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-[1.5rem] bg-white p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Raspodjela Ugovora Po Kategorijama</h2>
            <p className="text-sm text-slate-500 mt-1">Pregled vrijednosti i broja ugovora po tipu nabavke za {now.getFullYear()}. godinu</p>
          </div>
          <div className="hidden sm:block">
             <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <div className="size-2 rounded-full bg-blue-500" /> Robe
               <div className="size-2 rounded-full bg-cyan-400 ml-2" /> Usluge
               <div className="size-2 rounded-full bg-violet-400 ml-2" /> Radovi
             </div>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <CategoryChart data={displayCategoryData} />
        </div>
      </div>

      {/* Two Panels */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Buyers Panel */}
        <div className="rounded-[1.5rem] bg-white shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Building2 className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Najaktivniji Naručioci</h2>
                <p className="text-xs text-slate-500 font-medium">Top 10 po broju raspisanih tendera (Ovaj mjesec)</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-2">
            {displayTopAuthorities.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm font-medium text-slate-400">Nema dovoljno podataka za ovaj mjesec.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {displayTopAuthorities.map((a, i) => (
                  <div key={a.name} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        {i + 1}
                      </div>
                      {a.jib ? (
                        <Link href={`/dashboard/intelligence/authority/${a.jib}`} className="truncate text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                          {a.name}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-bold text-slate-700">{a.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Tenderi</span>
                      <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md min-w-[2rem] text-center">{a.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Winners Panel */}
        <div className="rounded-[1.5rem] bg-white shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Trophy className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Najuspješniji Ponuđači</h2>
                <p className="text-xs text-slate-500 font-medium">Top 10 po ukupnoj vrijednosti ugovora (Ova godina)</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-2">
            {displayTopWinners.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm font-medium text-slate-400">Nema dovoljno podataka za ovu godinu.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {displayTopWinners.map((w, i) => (
                  <div key={w.jib} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{w.name}</p>
                        <p className="text-xs text-slate-500">Ugovora: {w.wins}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-emerald-600 ml-4 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                      {formatKM(w.total_value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
