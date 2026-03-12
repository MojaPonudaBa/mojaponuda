import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { CategoryChart } from "@/components/intelligence/category-chart";
import { TrendingUp, FileText, BarChart3, Database } from "lucide-react";
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

  const { isSubscribed } = await getSubscriptionStatus(user.id);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tržišna Analitika
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Pregled BiH tržišta javnih nabavki baziran na e-Procurement portalu.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Ažurirano</p>
          <p className="mt-1 text-sm font-medium text-slate-600">
            U realnom vremenu
          </p>
        </div>
      </div>

      {/* Kartice */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Aktivni Tenderi</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-bold text-slate-900">{activeCount ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Trenutno s otvorenim rokom</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Godišnji Volumen</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-bold text-slate-900">{formatKM(yearTotalValue)}</p>
          <p className="mt-2 text-sm text-slate-500">Dodijeljeno u {now.getFullYear()}.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Pokrivenost Tržišta</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BarChart3 className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-bold text-slate-900">100%</p>
          <p className="mt-2 text-sm text-slate-500">Indeksirani podaci s ejn.gov.ba</p>
        </div>
      </div>

      {/* Bar chart: tenderi po kategoriji */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <h2 className="font-heading text-lg font-bold text-slate-900">Raspodjela Ugovora Po Kategorijama</h2>
          <p className="text-sm text-slate-500">Podaci od 01.01.{now.getFullYear()}.</p>
        </div>
        <CategoryChart data={categoryData} />
      </div>

      {/* Dva panela */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top naručioci */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Najaktivniji Naručioci</h2>
              <p className="mt-1 text-sm text-slate-500">Top 10 po broju raspisanih tendera u ovom mjesecu</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Database className="size-5" />
            </div>
          </div>
          
          <div className="flex-1 p-6">
            {topAuthorities.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12">
                <p className="text-sm text-slate-500">Nema dovoljno podataka za ovaj mjesec.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topAuthorities.map((a, i) => (
                  <div key={a.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                        {i + 1}
                      </span>
                      {a.jib ? (
                        <Link href={`/dashboard/intelligence/authority/${a.jib}`} className="truncate text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">
                          {a.name}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-semibold text-slate-700">{a.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-slate-500">Tendera:</span>
                      <span className="font-semibold text-primary">{a.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top pobjednici */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Najuspješniji Ponuđači</h2>
              <p className="mt-1 text-sm text-slate-500">Top 10 po ukupnoj vrijednosti ugovora u ovoj godini</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Database className="size-5" />
            </div>
          </div>
          
          <div className="flex-1 p-6">
            {topWinners.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12">
                <p className="text-sm text-slate-500">Nema dovoljno podataka za ovu godinu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topWinners.map((w, i) => (
                  <div key={w.jib} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700 group-hover:text-emerald-700 mb-0.5">{w.name}</p>
                        <p className="text-xs text-slate-500">Ugovora: {w.wins}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-emerald-600 ml-4">{formatKM(w.total_value)}</span>
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
