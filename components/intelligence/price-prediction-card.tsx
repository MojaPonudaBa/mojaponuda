import type { PricePrediction } from "@/lib/price-prediction";
import { TrendingDown } from "lucide-react";

function fmtMoney(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(n) + " KM";
}

const confidenceLabel: Record<PricePrediction["confidence"], string> = {
  high: "visoka",
  medium: "srednja",
  low: "niska",
};

const confidenceClass: Record<PricePrediction["confidence"], string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-amber-100 text-amber-800 border-amber-200",
};

const basedOnLabel: Record<PricePrediction["based_on"], string> = {
  "authority+cpv": "naručilac + kategorija",
  authority: "naručilac",
  cpv: "kategorija",
};

export function PricePredictionCard({ p }: { p: PricePrediction | null }) {
  if (!p) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
            <TrendingDown className="size-4 text-emerald-600" />
            Predikcija cijene
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Izvor: {basedOnLabel[p.based_on]} · {p.based_on_count} historijskih tendera
          </p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${confidenceClass[p.confidence]}`}>
          {confidenceLabel[p.confidence]} pouzdanost
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Minimum</div>
          <div className="mt-1 text-base font-heading font-semibold tracking-tight text-slate-900">
            {fmtMoney(p.suggested_min)}
          </div>
        </div>
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">Optimalno</div>
          <div className="mt-1 text-base font-heading font-bold tracking-tight text-emerald-800">
            {fmtMoney(p.suggested_optimal)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Maksimum</div>
          <div className="mt-1 text-base font-heading font-semibold tracking-tight text-slate-900">
            {fmtMoney(p.suggested_max)}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        Prosječni pobjednički popust: <span className="font-semibold">{p.avg_discount_pct}%</span>. {p.explanation}
      </p>
    </div>
  );
}
