import {
  Banknote,
  Gauge,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TenderDecisionInsight } from "@/lib/tender-decision";
import { cn } from "@/lib/utils";

function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return "Nije dostupno";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K KM`;
  return `${Math.round(value)} KM`;
}

function getScoreTone(value: number): string {
  if (value >= 75) return "text-emerald-700";
  if (value >= 58) return "text-blue-700";
  return "text-amber-700";
}

function getRecommendationClasses(recommendation: TenderDecisionInsight["recommendation"]): string {
  if (recommendation === "bid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (recommendation === "skip") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getCompetitionClasses(level: TenderDecisionInsight["competitionLevel"]): string {
  if (level === "low") return "text-emerald-700";
  if (level === "high") return "text-rose-700";
  if (level === "medium") return "text-amber-700";
  return "text-slate-500";
}

function hasWinEvidence(insight: TenderDecisionInsight): boolean {
  return insight.winProbability > 0 && insight.winConfidence !== "low";
}

function formatWinProbability(insight: TenderDecisionInsight): string {
  return hasWinEvidence(insight) ? `${insight.winProbability}%` : "Niska pouzdanost";
}

export function TenderDecisionMetrics({
  insight,
  compact = false,
}: {
  insight: TenderDecisionInsight | null | undefined;
  compact?: boolean;
}) {
  if (!insight) {
    return null;
  }

  const price =
    insight.priceRange.min && insight.priceRange.max
      ? `${formatMoney(insight.priceRange.min)} - ${formatMoney(insight.priceRange.max)}`
      : insight.priceRange.optimal
        ? formatMoney(insight.priceRange.optimal)
        : "Nema dovoljno podataka";

  return (
    <div className={cn("grid gap-2", compact ? "sm:grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-5")}>
      <Metric
        icon={Gauge}
        label="Usklađenost"
        value={`${insight.matchScore}%`}
        valueClassName={getScoreTone(insight.matchScore)}
      />
      <Metric
        icon={Target}
        label="Šansa"
        value={formatWinProbability(insight)}
        valueClassName={hasWinEvidence(insight) ? getScoreTone(insight.winProbability + 35) : "text-slate-500"}
      />
      <Metric
        icon={Banknote}
        label="Cijena"
        value={price}
        smallValue
      />
      <Metric
        icon={ShieldAlert}
        label="Konkurencija"
        value={insight.competitionLabel.replace(" konkurencija", "")}
        valueClassName={getCompetitionClasses(insight.competitionLevel)}
      />
      <div className={cn("rounded-lg border px-3 py-2", getRecommendationClasses(insight.recommendation))}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase">
          <TrendingUp className="size-3.5" />
          Odluka
        </div>
        <div className="mt-1 text-sm font-bold">{insight.recommendationLabel}</div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  valueClassName,
  smallValue = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
  smallValue?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500">
        <Icon className="size-3.5 text-blue-600" />
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-bold text-slate-900",
          smallValue ? "text-xs" : "text-sm",
          valueClassName,
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
