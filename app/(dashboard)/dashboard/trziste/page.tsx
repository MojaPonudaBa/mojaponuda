import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CpvBarChart, MonthlyTrendChart } from "@/components/trziste/market-charts";

export const dynamic = "force-dynamic";

function fmtMoney(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(n) + " KM";
}

async function fetchActiveTenderStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = supabase as any;

  const { count } = await any
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gt("deadline", nowIso);

  // Napomena: sum na klijentskoj strani zbog PostgREST limitacija.
  const { data: tvals } = await any
    .from("tenders")
    .select("estimated_value, cpv_code, created_at")
    .gt("deadline", nowIso)
    .limit(5000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = tvals ?? [];
  const totalValue = rows.reduce((s, r) => s + Number(r.estimated_value ?? 0), 0);

  const cpvCounter = new Map<string, number>();
  for (const r of rows) {
    const code = (r.cpv_code ?? "").toString().replace(/[^0-9]/g, "").slice(0, 2);
    if (!code) continue;
    cpvCounter.set(code, (cpvCounter.get(code) ?? 0) + 1);
  }
  const cpvData = [...cpvCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cpv, count]) => ({ cpv, count }));

  return { activeCount: count ?? 0, totalValue, cpvData };
}

async function fetchMonthlyTrend(supabase: Awaited<ReturnType<typeof createClient>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = supabase as any;
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const { data } = await any
    .from("tenders")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .limit(20000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? [];
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].sort().map(([month, count]) => ({ month, count }));
}

async function fetchTopAuthorities(supabase: Awaited<ReturnType<typeof createClient>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = supabase as any;
  const { data } = await any
    .from("authority_stats")
    .select("authority_jib, authority_name, tender_count, total_estimated_value")
    .order("tender_count", { ascending: false })
    .limit(10);
  return data ?? [];
}

async function fetchTopCompanies(supabase: Awaited<ReturnType<typeof createClient>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = supabase as any;
  const { data } = await any
    .from("company_stats")
    .select("company_jib, company_name, total_wins, total_won_value, win_rate")
    .order("total_won_value", { ascending: false })
    .limit(10);
  return data ?? [];
}

export default async function MarketOverviewPage() {
  const supabase = await createClient();

  const [stats, trend, topAuth, topComp] = await Promise.all([
    fetchActiveTenderStats(supabase),
    fetchMonthlyTrend(supabase),
    fetchTopAuthorities(supabase),
    fetchTopCompanies(supabase),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pregled tržišta
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Globalni pregled javnih nabavki u BiH — aktivni tenderi, trendovi i najaktivniji učesnici.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Aktivni tenderi</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">
            {stats.activeCount.toLocaleString("bs-BA")}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Ukupna vrijednost aktivnih</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">
            {fmtMoney(stats.totalValue)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Nove objave (12 mj)</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">
            {trend.reduce((s, x) => s + x.count, 0).toLocaleString("bs-BA")}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Raspodjela po CPV grupi (top 10)
          </h3>
          {stats.cpvData.length > 0 ? (
            <CpvBarChart data={stats.cpvData} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Nema podataka.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Trend objave tendera (12 mjeseci)
          </h3>
          {trend.length > 0 ? (
            <MonthlyTrendChart data={trend} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Nema podataka.</p>
          )}
        </div>
      </div>

      {/* Top authorities + companies */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Top 10 naručilaca (po broju objavljenih)
          </h3>
          <ul className="divide-y divide-slate-200">
            {topAuth.length === 0 && (
              <li className="py-3 text-sm text-slate-500">
                Agregati još nisu popunjeni. Pokreni <code>scripts/backfill-analytics.ts</code>.
              </li>
            )}
            {topAuth.map((a: { authority_jib: string; authority_name: string | null; tender_count: number; total_estimated_value: number }) => (
              <li key={a.authority_jib} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href={`/dashboard/intelligence/authority/${a.authority_jib}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 hover:text-blue-700"
                >
                  {a.authority_name ?? a.authority_jib}
                </Link>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{a.tender_count}</div>
                  <div className="text-[11px] text-slate-500">{fmtMoney(Number(a.total_estimated_value))}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Top 10 dobavljača (po vrijednosti dobijenih ugovora)
          </h3>
          <ul className="divide-y divide-slate-200">
            {topComp.length === 0 && (
              <li className="py-3 text-sm text-slate-500">
                Agregati još nisu popunjeni. Pokreni <code>scripts/backfill-analytics.ts</code>.
              </li>
            )}
            {topComp.map((c: { company_jib: string; company_name: string | null; total_wins: number; total_won_value: number; win_rate: number | null }) => (
              <li key={c.company_jib} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href={`/dashboard/intelligence/company/${c.company_jib}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 hover:text-blue-700"
                >
                  {c.company_name ?? c.company_jib}
                </Link>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{fmtMoney(Number(c.total_won_value))}</div>
                  <div className="text-[11px] text-slate-500">
                    {c.total_wins} pobjeda · {c.win_rate !== null ? `${c.win_rate}% win rate` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
