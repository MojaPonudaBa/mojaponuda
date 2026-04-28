import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CpvBarChart, MonthlyTrendChart } from "@/components/trziste/market-charts";
import { ShieldCheck, Target, TrendingUp, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtMoney(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(n) + " KM";
}

function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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
    .select("estimated_value, cpv_code, deadline")
    .gt("deadline", nowIso)
    .limit(5000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = tvals ?? [];
  const knownValueRows = rows.filter((r) => Number(r.estimated_value) > 0);
  const totalValue = knownValueRows.reduce((s, r) => s + Number(r.estimated_value ?? 0), 0);

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

  return { activeCount: count ?? 0, totalValue, knownValueCount: knownValueRows.length, cpvData };
}

async function fetchMonthlyTrend(supabase: Awaited<ReturnType<typeof createClient>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = supabase as any;
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const { data } = await any
    .from("award_decisions")
    .select("award_date, winning_price")
    .gte("award_date", since.toISOString().slice(0, 10))
    .limit(20000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? [];
  const buckets = new Map<string, number>();
  for (const r of rows) {
    if (!r.award_date) continue;
    const d = new Date(r.award_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].sort().map(([month, count]) => ({ month, count }));
}

async function fetchMarketSignals(supabase: Awaited<ReturnType<typeof createClient>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = supabase as any;
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const { data } = await any
    .from("award_decisions")
    .select("winner_jib, winner_name, winning_price, total_bidders_count, discount_pct, contract_type, award_date")
    .gte("award_date", since.toISOString().slice(0, 10))
    .limit(20000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? [];
  const bidderSamples = rows
    .map((row) => Number(row.total_bidders_count))
    .filter((value) => Number.isFinite(value) && value > 0);
  const discountSamples = rows
    .map((row) => Number(row.discount_pct))
    .filter((value) => Number.isFinite(value) && value > 0);
  const priceSamples = rows
    .map((row) => Number(row.winning_price))
    .filter((value) => Number.isFinite(value) && value > 0);

  const winnerMap = new Map<string, { name: string; wins: number; value: number }>();
  for (const row of rows) {
    if (!row.winner_jib) continue;
    const existing = winnerMap.get(row.winner_jib);
    const value = Number(row.winning_price) || 0;
    if (existing) {
      existing.wins += 1;
      existing.value += value;
    } else {
      winnerMap.set(row.winner_jib, { name: row.winner_name ?? row.winner_jib, wins: 1, value });
    }
  }
  const topWinner = [...winnerMap.values()].sort((a, b) => b.wins - a.wins || b.value - a.value)[0] ?? null;
  const topWinnerShare = topWinner && rows.length > 0 ? Math.round((topWinner.wins / rows.length) * 100) : null;

  return {
    awardCount: rows.length,
    avgBidders: bidderSamples.length > 0 ? bidderSamples.reduce((sum, value) => sum + value, 0) / bidderSamples.length : null,
    bidderSampleCount: bidderSamples.length,
    avgDiscount: discountSamples.length > 0 ? discountSamples.reduce((sum, value) => sum + value, 0) / discountSamples.length : null,
    discountSampleCount: discountSamples.length,
    medianAwardValue: median(priceSamples),
    priceSampleCount: priceSamples.length,
    topWinner,
    topWinnerShare,
  };
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

  const [stats, trend, topAuth, topComp, marketSignals] = await Promise.all([
    fetchActiveTenderStats(supabase),
    fetchMonthlyTrend(supabase),
    fetchTopAuthorities(supabase),
    fetchTopCompanies(supabase),
    fetchMarketSignals(supabase),
  ]);
  const topCpv = stats.cpvData[0] ?? null;
  const opportunityCards = [
    {
      title: "Gdje ima najvise otvorenih prilika",
      value: topCpv ? `CPV ${topCpv.cpv}` : "Nema uzorka",
      body: topCpv
        ? `${topCpv.count} otvorenih tendera u najjacoj aktivnoj CPV grupi. Koristite ovo za brzo skeniranje trzista i postavljanje pracenja.`
        : "Nema dovoljno aktivnih tendera za CPV zakljucak.",
      icon: Target,
      tone: "border-blue-100 bg-blue-50 text-blue-800",
    },
    {
      title: "Konkurencija",
      value: marketSignals.avgBidders !== null ? `${marketSignals.avgBidders.toFixed(1)} ponudjaca` : "Indirektan signal",
      body: marketSignals.avgBidders !== null
        ? `Zasnovano na ${marketSignals.bidderSampleCount} dodjela sa objavljenim brojem ponudjaca u zadnjih 12 mjeseci.`
        : "Broj ponudjaca je slabo popunjen, pa se za procjenu konkurencije koristi sirina pobjednika i ponavljanje narucilaca.",
      icon: Users,
      tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
    },
    {
      title: "Cijena i popust",
      value: marketSignals.avgDiscount !== null ? `${marketSignals.avgDiscount.toFixed(1)}%` : fmtMoney(marketSignals.medianAwardValue),
      body: marketSignals.avgDiscount !== null
        ? `Prosjecan poznati popust iz ${marketSignals.discountSampleCount} dodjela. Koristiti samo kao okvir po trzistu.`
        : marketSignals.priceSampleCount > 0
          ? `Medijan pobjednicke cijene iz ${marketSignals.priceSampleCount} poznatih dodjela.`
          : "Nema dovoljno cijena za opsti cjenovni signal.",
      icon: TrendingUp,
      tone: "border-amber-100 bg-amber-50 text-amber-800",
    },
    {
      title: "Dominacija dobavljaca",
      value: marketSignals.topWinnerShare !== null && marketSignals.topWinner ? `${marketSignals.topWinnerShare}%` : "Nema obrasca",
      body: marketSignals.topWinnerShare !== null && marketSignals.topWinner
        ? `${marketSignals.topWinner.name} je najcesci poznati pobjednik u uzorku. Otvorite profil da vidite gdje je stvarno jak.`
        : "Nema dovoljno pobjednika za procjenu koncentracije trzista.",
      icon: ShieldCheck,
      tone: "border-slate-200 bg-white text-slate-800",
    },
  ];

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
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Poznata vrijednost aktivnih</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">
            {stats.knownValueCount > 0 ? fmtMoney(stats.totalValue) : "Nije objavljena"}
          </div>
          <p className="mt-1 text-xs text-slate-500">{stats.knownValueCount} aktivnih tendera ima objavljenu vrijednost.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Dodjele (12 mj)</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">
            {trend.reduce((s, x) => s + x.count, 0).toLocaleString("bs-BA")}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">Trzisni zakljucci</h2>
          <p className="mt-1 text-sm text-slate-500">
            Signal za akciju iz dostupnih tendera i dodjela; gdje podaci nisu potpuni, prikazujemo indirektan signal.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {opportunityCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`rounded-2xl border p-4 ${card.tone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">{card.title}</p>
                    <p className="mt-1 text-lg font-heading font-extrabold">{card.value}</p>
                  </div>
                  <Icon className="mt-1 size-4 shrink-0 opacity-70" />
                </div>
                <p className="mt-3 text-sm leading-6 opacity-90">{card.body}</p>
              </div>
            );
          })}
        </div>
      </section>

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
            Trend dodjela (12 mjeseci)
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
                    {c.total_wins} pobjeda · {c.win_rate !== null ? `${c.win_rate}% stopa uspjeha` : ""}
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
