import Link from "next/link";
import type { UserBidStats } from "@/lib/user-bid-analytics";
import { Trophy, Target, TrendingUp } from "lucide-react";

function fmtMoney(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(n) + " KM";
}

export function UserStatsCard({ stats }: { stats: UserBidStats }) {
  if (stats.totalBids === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-900">Vaša statistika</h2>
        </div>
        <Link href="/dashboard/ponude" className="text-xs text-blue-600 hover:underline">
          Tok ponuda →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Predano</div>
          <div className="mt-1 text-xl font-heading font-bold text-slate-900">{stats.totalBids}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Pobjeda</div>
          <div className="mt-1 text-xl font-heading font-bold text-emerald-700">{stats.totalWins}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Stopa uspjeha</div>
          <div className="mt-1 text-xl font-heading font-bold text-blue-700">
            {stats.winRate !== null ? `${stats.winRate}%` : "—"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Dobijeno</div>
          <div className="mt-1 text-xl font-heading font-bold text-slate-900">{fmtMoney(stats.totalWonValue)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {stats.topAuthorities.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <Target className="size-4" />
              Top naručioci (nastupi)
            </div>
            <ul className="space-y-1.5">
              {stats.topAuthorities.map((a) => (
                <li key={a.name} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-800">{a.name}</span>
                  <span className="shrink-0 font-semibold text-slate-600">{a.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats.topCpvByWinRate.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <TrendingUp className="size-4" />
              Najbolje CPV kategorije (stopa uspjeha)
            </div>
            <ul className="space-y-1.5">
              {stats.topCpvByWinRate.map((c) => (
                <li key={c.cpv} className="flex items-center justify-between text-sm">
                  <span className="text-slate-800">CPV {c.cpv}*</span>
                  <span className="shrink-0 font-semibold text-emerald-700">
                    {c.winRate}%
                    <span className="ml-1 font-normal text-xs text-slate-500">({c.sample})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
