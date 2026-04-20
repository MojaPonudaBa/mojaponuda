import Link from "next/link";
import type { CompetitorSummary, SimilarTender } from "@/lib/competitor-intelligence";
import { Users2, History } from "lucide-react";

function fmtMoney(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(n) + " KM";
}
function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v));
  } catch {
    return "—";
  }
}

export function CompetitorsCard({
  competitors,
  similar,
}: {
  competitors: CompetitorSummary[];
  similar: SimilarTender[];
}) {
  if (competitors.length === 0 && similar.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        <Users2 className="size-4 text-blue-600" />
        Ko se obično natječe ovdje
      </div>

      {competitors.length === 0 ? (
        <p className="text-sm text-slate-500">Nema dovoljno historijskih nastupa za ovu kombinaciju.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {competitors.map((c) => (
            <li key={c.jib} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/intelligence/company/${c.jib}`}
                  className="truncate text-sm font-semibold text-slate-900 hover:text-blue-700"
                >
                  {c.name}
                </Link>
                <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  <span>{c.wins} pobjeda / {c.appearances} nastupa</span>
                  {c.avg_winning_price !== null && <span>prosjek {fmtMoney(c.avg_winning_price)}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-heading font-bold text-slate-900">
                  {c.win_rate !== null ? `${c.win_rate}%` : `${Math.round((c.wins / Math.max(1, c.appearances)) * 100)}%`}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">win rate</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {similar.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
            <History className="size-4 text-slate-500" />
            Slični prošli tenderi
          </div>
          <ul className="space-y-2 text-xs">
            {similar.map((s) => (
              <li key={s.id} className="rounded-xl bg-slate-50 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 font-medium text-slate-800">{s.title}</span>
                  <span className="shrink-0 text-slate-500">{fmtDate(s.award_date)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                  {s.winner_name && <span>Pobjednik: <span className="font-medium">{s.winner_name}</span></span>}
                  {s.winning_price !== null && <span>Cijena: {fmtMoney(s.winning_price)}</span>}
                  {s.discount_pct !== null && <span>Popust: {s.discount_pct}%</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
