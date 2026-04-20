import { CheckCircle2, Circle, Clock } from "lucide-react";

export interface TimelinePhase {
  key: string;
  label: string;
  date: string | null;
}

interface Props {
  phases: TimelinePhase[];
  nowIso?: string;
}

function fmtDate(v: string | null): string {
  if (!v) return "";
  try {
    return new Intl.DateTimeFormat("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v));
  } catch {
    return "";
  }
}

export function TenderTimeline({ phases, nowIso }: Props) {
  const now = new Date(nowIso ?? Date.now()).getTime();
  // Prikaži samo faze koje imaju datum
  const visible = phases.filter((p) => p.date);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Timeline nabavke
      </h3>
      <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
        {visible.map((p) => {
          const t = new Date(p.date!).getTime();
          const past = t < now;
          const isNext = !past && !visible.some((q) => q.date && new Date(q.date).getTime() < t && new Date(q.date).getTime() > now);
          return (
            <li key={p.key} className="relative">
              <div className="absolute -left-[30px] top-0 flex size-5 items-center justify-center rounded-full bg-white">
                {past ? (
                  <CheckCircle2 className="size-5 text-emerald-500" />
                ) : isNext ? (
                  <Clock className="size-5 text-blue-500" />
                ) : (
                  <Circle className="size-5 text-slate-300" />
                )}
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-sm font-medium ${past ? "text-slate-500" : "text-slate-900"}`}>
                  {p.label}
                </span>
                <span className="text-xs font-medium text-slate-500">{fmtDate(p.date)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
