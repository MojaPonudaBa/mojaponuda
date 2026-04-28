import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  Clock3,
  FileText,
  Lock,
  MapPin,
  Users,
} from "lucide-react";
import type { Tender } from "@/types/database";
import type { TenderDecisionInsight } from "@/lib/tender-decision";
import { TenderDecisionMetrics } from "@/components/tenders/tender-decision-metrics";
import { cn } from "@/lib/utils";

interface TenderCardProps {
  tender: Tender;
  locked?: boolean;
  clientNames?: string[];
  href?: string;
  insight?: TenderDecisionInsight | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Rok nije objavljen";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "Vrijednost nije objavljena";
  return `${new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(value)} KM`;
}

function getDeadlineMeta(deadline: string | null): {
  label: string;
  className: string;
} {
  if (!deadline) {
    return { label: "Rok nije objavljen", className: "text-slate-500" };
  }

  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "Rok istekao", className: "text-slate-400 line-through" };
  if (days === 0) return { label: "Rok danas", className: "text-rose-600 font-bold" };
  if (days <= 7) return { label: `${days} dana`, className: "text-rose-600 font-bold" };
  if (days <= 21) return { label: `${days} dana`, className: "text-amber-600 font-bold" };
  return { label: formatDate(deadline), className: "text-slate-700" };
}

function getRiskClass(tone: "critical" | "warning" | "info") {
  if (tone === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function decisionActionText(insight: TenderDecisionInsight): string {
  if (insight.recommendation === "bid") {
    return "Započni pripremu: ovo je tender koji zaslužuje radni prostor.";
  }
  if (insight.recommendation === "skip") {
    return "Preskoči za sada: zadrži ga kao tržišni signal, ne kao prioritet.";
  }
  if (insight.riskLevel === "high") {
    return "Provjeri rizike prije ulaska: uslovi, rok i konkurencija su ključni.";
  }
  return "Provjeri pa odluči: ako nema blokera, prebaci u tok ponuda.";
}

export function TenderCard({
  tender,
  locked = false,
  clientNames,
  href,
  insight,
}: TenderCardProps) {
  const deadline = getDeadlineMeta(tender.deadline);
  const resolvedHref = href ?? (locked ? "/dashboard/subscription" : `/dashboard/tenders/${tender.id}`);

  return (
    <Link href={resolvedHref} prefetch className="group block">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-blue-200 hover:shadow-md">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 sm:flex">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {tender.contract_type ?? "Tender"}
                  </span>
                  {tender.procedure_type ? (
                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {tender.procedure_type}
                    </span>
                  ) : null}
                </div>
                <h3 className={cn("mt-2 line-clamp-2 text-base font-bold leading-6 text-slate-950 sm:text-lg", locked && "select-none blur-sm")}>
                  {locked ? `Tender #${tender.id.slice(0, 4)} - ${tender.contract_type ?? "Javna nabavka"}` : tender.title}
                </h3>

                {clientNames?.length ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {clientNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700"
                      >
                        <Users className="size-3 shrink-0" />
                        <span className="truncate">{name}</span>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span className={cn("inline-flex max-w-full items-center gap-1.5", locked && "select-none blur-sm")}>
                    <Building2 className="size-4 shrink-0 text-slate-400" />
                    <span className="truncate" title={tender.contracting_authority ?? ""}>
                      {locked ? "Javni naručilac" : tender.contracting_authority ?? "Nepoznat naručilac"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-4 shrink-0 text-slate-400" />
                    <span className={deadline.className}>{deadline.label}</span>
                  </span>
                  <span className={cn("inline-flex items-center gap-1.5 font-semibold text-slate-800", locked && "select-none blur-sm")}>
                    <Banknote className="size-4 shrink-0 text-slate-400" />
                    {locked ? "XXX.XXX KM" : formatValue(tender.estimated_value)}
                  </span>
                  {tender.cpv_code ? (
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <MapPin className="size-4 shrink-0 text-slate-400" />
                      CPV {tender.cpv_code}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 xl:min-w-[128px] xl:flex-col xl:items-end xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Detalji
            </span>
            <span className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
              {locked ? <Lock className="size-4" /> : <ArrowRight className="size-4" />}
            </span>
          </div>
        </div>

        {insight && !locked ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <TenderDecisionMetrics insight={insight} compact />
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.riskIndicators.slice(0, 3).map((risk) => (
                <span key={risk.label} className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold", getRiskClass(risk.tone))}>
                  {risk.label}
                </span>
              ))}
              {insight.keyReasons[0] ? (
                <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {insight.keyReasons[0]}
                </span>
              ) : null}
            </div>
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
              Šta uraditi: {decisionActionText(insight)}
            </div>
          </div>
        ) : null}
      </article>
    </Link>
  );
}
