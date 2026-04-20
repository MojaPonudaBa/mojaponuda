import type { WinProbability } from "@/lib/win-probability";
import { Target } from "lucide-react";

const confLabel: Record<WinProbability["confidence"], string> = {
  high: "visoka",
  medium: "srednja",
  low: "niska",
};

const confClass: Record<WinProbability["confidence"], string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-amber-100 text-amber-800 border-amber-200",
};

function probTone(p: number): string {
  if (p >= 50) return "text-emerald-700";
  if (p >= 25) return "text-blue-700";
  return "text-slate-700";
}

export function WinProbabilityCard({ wp }: { wp: WinProbability | null }) {
  if (!wp) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
          <Target className="size-4 text-blue-600" />
          Šansa za pobjedu
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${confClass[wp.confidence]}`}>
          {confLabel[wp.confidence]} pouzdanost
        </span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <span className={`text-5xl font-heading font-bold leading-none tracking-tight ${probTone(wp.probability)}`}>
          {wp.probability}%
        </span>
        <span className="pb-1 text-xs text-slate-500">
          {wp.based_on_bidders ? `prosječno ${wp.based_on_bidders} ponuđača` : ""}
        </span>
      </div>

      {wp.factors.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-slate-700">
          {wp.factors.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {wp.confidence === "low" && (
        <p className="mt-3 rounded-xl bg-amber-50 p-2 text-[11px] text-amber-800">
          Mala količina historijskih podataka za ovu kombinaciju — koristite procjenu samo okvirno.
        </p>
      )}
    </div>
  );
}
