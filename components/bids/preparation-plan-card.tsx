import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  buildPreparationPlan,
  type TenderDecisionInsight,
  type TenderDecisionTender,
} from "@/lib/tender-decision";
import { cn } from "@/lib/utils";

function toneClass(tone: "blue" | "green" | "amber") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function decisionClass(recommendation: TenderDecisionInsight["recommendation"]) {
  if (recommendation === "bid") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (recommendation === "skip") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function PreparationPlanCard({
  tender,
  insight,
  checklistCount,
  missingChecklistCount,
}: {
  tender: TenderDecisionTender | null;
  insight: TenderDecisionInsight | null;
  checklistCount: number;
  missingChecklistCount: number;
}) {
  const plan = buildPreparationPlan({
    tender,
    insight,
    checklistCount,
    missingChecklistCount,
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase text-slate-600">
            <ListChecks className="size-4 text-blue-600" />
            Plan pripreme
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Prioritet, napor i sljedeći koraci</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Plan koristi iste signale odluke kao tender: usklađenost, očekivanu konkurenciju, cijenu i otvorene stavke pripreme.
          </p>
        </div>
        {insight ? (
          <div className="grid min-w-[260px] grid-cols-3 gap-2">
            <MiniStat icon={TrendingUp} label="Prioritet" value={`${insight.priorityScore}`} />
            <MiniStat
              icon={Target}
              label="Šansa"
              value={insight.winProbability > 0 && insight.winConfidence !== "low" ? `${insight.winProbability}%` : "Provjera"}
            />
            <MiniStat icon={Clock3} label="Napor" value={insight.estimatedEffort.split(" - ")[0]} />
          </div>
        ) : null}
      </div>

      {insight ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={cn("inline-flex items-center rounded-lg border px-3 py-1 text-sm font-bold", decisionClass(insight.recommendation))}>
            {insight.recommendationLabel}
          </span>
          <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
            Usklađenost {insight.matchScore}%
          </span>
          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
            {insight.competitionLabel}
          </span>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plan.map((item, index) => (
          <div key={item.title} className={cn("rounded-lg border p-4", toneClass(item.tone))}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase">
              {index === 0 ? <Target className="size-4" /> : index === 1 ? <TrendingUp className="size-4" /> : index === 2 ? <FileCheck2 className="size-4" /> : <CheckCircle2 className="size-4" />}
              {item.title}
            </div>
            <p className="mt-2 text-sm leading-6">{item.detail}</p>
          </div>
        ))}
      </div>

      {insight?.riskIndicators.length ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4" />
            Rizici za pripremu
          </div>
          <p className="mt-1 leading-6">
            {insight.riskIndicators.map((risk) => risk.label).join(" · ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
        <Icon className="size-3 text-blue-600" />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-bold text-slate-950" title={value}>
        {value}
      </div>
    </div>
  );
}
