import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Info,
  ShieldAlert,
  Target,
  TrendingUp,
  Users2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { TenderDecisionInsight } from "@/lib/tender-decision";
import { TenderDecisionMetrics } from "@/components/tenders/tender-decision-metrics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return "Nije dostupno";
  return `${new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(value)} KM`;
}

function getRecommendationShell(recommendation: TenderDecisionInsight["recommendation"]) {
  if (recommendation === "bid") {
    return {
      icon: CheckCircle2,
      classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
      label: "Preporuka: Uđi",
    };
  }

  if (recommendation === "skip") {
    return {
      icon: AlertCircle,
      classes: "border-rose-200 bg-rose-50 text-rose-800",
      label: "Preporuka: Preskoči",
    };
  }

  return {
    icon: ShieldAlert,
    classes: "border-amber-200 bg-amber-50 text-amber-800",
    label: "Preporuka: Provjeri pa uđi",
  };
}

function getRiskClass(tone: "critical" | "warning" | "info") {
  if (tone === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function confidenceLabel(value: TenderDecisionInsight["winConfidence"]): string {
  if (value === "high") return "visoka pouzdanost";
  if (value === "medium") return "srednja pouzdanost";
  return "niska pouzdanost";
}

function hasWinEvidence(insight: TenderDecisionInsight): boolean {
  return insight.winProbability > 0 && insight.winConfidence !== "low";
}

function nextActionText(insight: TenderDecisionInsight): string {
  if (insight.recommendation === "bid") {
    return "Krenite u pripremu: validirajte uslove, zakljucajte dokumente i otvorite cjenovni okvir prema poznatim dodjelama.";
  }
  if (insight.recommendation === "skip") {
    return "Ne trošiti vrijeme osim ako imate jaku internu prednost koja nije u profilu. Sačuvajte tender kao signal za praćenje naručioca ili CPV-a.";
  }
  if (insight.riskLevel === "high") {
    return "Prvo smanjite rizik: provjerite dokumentaciju, rokove, garancije i poznate konkurente prije ulaska u ponudu.";
  }
  return "Uradi brzu validaciju: provjeri cijenu, uslove i konkurenciju; zatim odluci da li tender ulazi u tok ponuda.";
}

function advantageSteps(insight: TenderDecisionInsight): Array<{ title: string; detail: string }> {
  const competitorDetail = insight.topCompetitors.length > 0
    ? `Provjeri ${insight.topCompetitors[0].name}; ovo je najčešći poznati pobjednik u sličnom kontekstu.`
    : "Nema dominantnog poznatog konkurenta; prednost je u brzoj validaciji i urednoj dokumentaciji.";

  const priceDetail = insight.priceRange.min && insight.priceRange.max
    ? `Drži kalkulaciju unutar ${formatMoney(insight.priceRange.min)} - ${formatMoney(insight.priceRange.max)} i zapiši pretpostavke.`
    : "Postavi interni cjenovni raspon prije čitanja detalja da izbjegneš kasnu improvizaciju.";

  const decisionDetail = insight.recommendation === "bid"
    ? "Ako nema blokera u dokumentaciji, prebaci tender u tok ponuda danas."
    : insight.recommendation === "skip"
      ? "Sačuvaj signal za praćenje naručioca/CPV-a, ali ne troši pripremni kapacitet bez posebne prednosti."
      : "Donesi odluku nakon kratke provjere rizika; ne ostavljaj tender u nejasnom statusu.";

  return [
    { title: "Prednost nad konkurencijom", detail: competitorDetail },
    { title: "Cjenovni potez", detail: priceDetail },
    { title: "Odluka danas", detail: decisionDetail },
  ];
}

export function TenderDecisionSummary({
  insight,
  startBidSlot,
}: {
  insight: TenderDecisionInsight | null;
  startBidSlot?: ReactNode;
}) {
  if (!insight) {
    return null;
  }

  const recommendation = getRecommendationShell(insight.recommendation);
  const RecommendationIcon = recommendation.icon;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold", recommendation.classes)}>
              <RecommendationIcon className="size-4" />
              {recommendation.label}
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              <TrendingUp className="size-4" />
              Prioritet {insight.priorityScore}/100
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
              <Clock3 className="size-4 text-blue-600" />
              {insight.estimatedEffort}
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-950">
            Odluka prije ulaska u pripremu
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {insight.explanation}
          </p>
        </div>

        {startBidSlot ? <div className="shrink-0">{startBidSlot}</div> : null}
      </div>

      <div className="mt-5">
        <TenderDecisionMetrics insight={insight} />
      </div>

      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        <span className="font-bold">Sljedeci potez: </span>
        {nextActionText(insight)}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {advantageSteps(insight).map((step) => (
          <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase text-slate-500">{step.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-800">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Info className="size-4 text-blue-600" />
            Zašto je tender prikazan
          </div>
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {insight.keyReasons.slice(0, 5).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-3 text-sm">
            <Fact
              icon={<Target className="size-4 text-blue-600" />}
              label="Šansa za pobjedu"
              value={hasWinEvidence(insight) ? `${insight.winProbability}% (${confidenceLabel(insight.winConfidence)})` : "Niska pouzdanost - gledati razloge i konkurenciju"}
            />
            <Fact
              icon={<Banknote className="size-4 text-blue-600" />}
              label="Ciljni raspon"
              value={
                insight.priceRange.min && insight.priceRange.max
                  ? `${formatMoney(insight.priceRange.min)} - ${formatMoney(insight.priceRange.max)}`
                  : insight.priceRange.optimal
                    ? formatMoney(insight.priceRange.optimal)
                    : "Nema dovoljno podataka"
              }
            />
            <Fact
              icon={<TrendingUp className="size-4 text-blue-600" />}
              label="Pobjednički popust"
              value={
                insight.winningDiscountRange.min !== null && insight.winningDiscountRange.max !== null
                  ? `${insight.winningDiscountRange.min}% - ${insight.winningDiscountRange.max}% (${confidenceLabel(insight.winningDiscountRange.confidence)})`
                  : "Nema dovoljno podataka"
              }
            />
            <Fact
              icon={<Users2 className="size-4 text-blue-600" />}
              label="Konkurencija"
              value={
                insight.expectedBiddersRange.min !== null && insight.expectedBiddersRange.max !== null
                  ? `${insight.competitionLabel}, ${insight.expectedBiddersRange.min}-${insight.expectedBiddersRange.max} ponuđača (${confidenceLabel(insight.expectedBiddersRange.confidence)})`
                  : `${insight.competitionLabel} (${confidenceLabel(insight.expectedBiddersRange.confidence)})`
              }
            />
            <Fact
              icon={<ShieldAlert className="size-4 text-blue-600" />}
              label="Rizik"
              value={insight.riskLevel === "high" ? "Visok" : insight.riskLevel === "low" ? "Nizak" : "Srednji"}
            />
          </div>
          {insight.topCompetitors.length > 0 ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Najčešći konkurenti</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                {insight.topCompetitors.slice(0, 3).map((competitor) => (
                  <div key={competitor.jib ?? competitor.name} className="rounded-md bg-white px-2 py-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold text-slate-800">{competitor.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-slate-500">
                        {competitor.confidence ? confidenceLabel(competitor.confidence) : "signal"}
                      </span>
                    </div>
                    {competitor.signals?.[0] ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{competitor.signals[0]}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <Button asChild variant="outline" className="mt-4 w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50">
            <Link href="/dashboard/trziste">
              Otvori tržišni kontekst
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {insight.riskIndicators.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {insight.riskIndicators.map((risk) => (
            <span key={risk.label} className={cn("inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold", getRiskClass(risk.tone))}>
              {risk.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-slate-950">{value}</p>
      </div>
    </div>
  );
}
