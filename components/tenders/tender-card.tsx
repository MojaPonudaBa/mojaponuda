import Link from "next/link";
import type { Tender } from "@/types/database";
import {
  ExternalLink,
  Clock,
  Building2,
  Tag,
  Banknote,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

interface TenderCardProps {
  tender: Tender;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " KM";
}

function getDeadlineStatus(deadline: string | null): {
  text: string;
  className: string;
  dotClass: string;
  urgent: boolean;
} {
  if (!deadline)
    return { text: "Nema roka", className: "text-slate-500", dotClass: "bg-slate-300", urgent: false };

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { text: `Istekao`, className: "text-slate-500 line-through", dotClass: "bg-slate-300", urgent: false };
  if (diffDays <= 3)
    return { text: `Još ${diffDays} dana`, className: "text-red-600 font-bold", dotClass: "bg-red-500 animate-pulse", urgent: true };
  if (diffDays <= 7)
    return { text: `Još ${diffDays} dana`, className: "text-amber-600 font-bold", dotClass: "bg-amber-500", urgent: true };
  if (diffDays <= 14)
    return { text: formatDate(deadline), className: "text-amber-600 font-medium", dotClass: "bg-amber-400", urgent: false };
  return { text: formatDate(deadline), className: "text-emerald-600 font-medium", dotClass: "bg-emerald-500", urgent: false };
}

const TYPE_COLORS: Record<string, string> = {
  Robe: "border-blue-200 bg-blue-50 text-blue-700",
  Usluge: "border-purple-200 bg-purple-50 text-purple-700",
  Radovi: "border-amber-200 bg-amber-50 text-amber-700",
};

export function TenderCard({ tender }: TenderCardProps) {
  const deadline = getDeadlineStatus(tender.deadline);
  const typeColor = tender.contract_type
    ? TYPE_COLORS[tender.contract_type] ?? "border-slate-200 bg-slate-50 text-slate-700"
    : null;

  return (
    <Link href={`/dashboard/tenders/${tender.id}`} className="group block">
      <div className="relative rounded-2xl border border-slate-200 bg-white transition-all hover:border-blue-300 hover:shadow-md">
        {/* Left accent stripe */}
        <div className={`absolute inset-y-0 left-0 w-1.5 rounded-l-2xl ${deadline.dotClass.replace("animate-pulse", "")}`} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 pl-7">
          <div className="min-w-0 flex-1 space-y-3">
            {/* Title */}
            <p className="text-base font-bold leading-snug text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
              {tender.title}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {tender.contracting_authority && (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="size-4 text-slate-400" />
                  <span className="truncate max-w-[250px] font-medium" title={tender.contracting_authority}>
                    {tender.contracting_authority}
                  </span>
                </span>
              )}
              <span className={`flex items-center gap-1.5 text-sm ${deadline.className}`}>
                <Clock className="size-4" />
                {deadline.text}
              </span>
              {tender.estimated_value !== null && (
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Banknote className="size-4 text-slate-400" />
                  {formatValue(tender.estimated_value)}
                </span>
              )}
            </div>
          </div>

          {/* Right side: type badge + arrow */}
          <div className="flex shrink-0 items-center sm:flex-col sm:items-end justify-between gap-3">
            {typeColor && (
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeColor}`}>
                {tender.contract_type}
              </span>
            )}
            <div className="hidden sm:flex size-8 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all mt-2">
              <ChevronRight className="size-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
