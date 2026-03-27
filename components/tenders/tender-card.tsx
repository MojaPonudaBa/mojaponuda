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
  FileText,
  Lock,
  Users,
} from "lucide-react";

interface TenderCardProps {
  tender: Tender;
  locked?: boolean;
  clientNames?: string[];
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
    return { text: `Još ${diffDays} dana`, className: "text-red-700 font-bold", dotClass: "bg-red-600 animate-pulse", urgent: true };
  if (diffDays <= 7)
    return { text: `Još ${diffDays} dana`, className: "text-amber-700 font-bold", dotClass: "bg-amber-500", urgent: true };
  if (diffDays <= 14)
    return { text: formatDate(deadline), className: "text-amber-700 font-medium", dotClass: "bg-amber-400", urgent: false };
  return { text: formatDate(deadline), className: "text-emerald-700 font-medium", dotClass: "bg-emerald-500", urgent: false };
}

const TYPE_COLORS: Record<string, string> = {
  Robe: "border-blue-200 bg-blue-50 text-blue-800",
  Usluge: "border-purple-200 bg-purple-50 text-purple-800",
  Radovi: "border-amber-200 bg-amber-50 text-amber-800",
};

export function TenderCard({ tender, locked = false, clientNames }: TenderCardProps) {
  const deadline = getDeadlineStatus(tender.deadline);
  const typeColor = tender.contract_type
    ? TYPE_COLORS[tender.contract_type] ?? "border-slate-200 bg-slate-50 text-slate-700"
    : null;

  return (
    <Link href={`/dashboard/tenders/${tender.id}`} className="group block">
      <div className="relative rounded bg-white p-4 border border-slate-200 transition-colors hover:border-slate-400">
        {/* Left accent stripe */}
        <div className={`absolute inset-y-0 left-0 w-1 rounded-l ${deadline.dotClass.replace("animate-pulse", "")}`} />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-3">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="hidden sm:flex size-10 shrink-0 items-center justify-center rounded-sm bg-slate-50 text-slate-600 border border-slate-200 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-200">
              <FileText className="size-5" />
            </div>

            <div className={`min-w-0 flex-1 space-y-2 ${locked ? "opacity-60" : ""}`}>
              {/* Title */}
              <p className={`text-base font-semibold leading-snug text-slate-900 transition-colors line-clamp-2 pr-4 ${locked ? "blur-sm select-none" : "group-hover:text-slate-700"}`}>
                {locked ? `Tender #${tender.id.substring(0, 4)} - ${tender.contract_type ?? 'Javna nabavka'}` : tender.title}
              </p>

              {/* Client attribution badges (agency view) */}
              {clientNames && clientNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {clientNames.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      <Users className="size-2.5" />
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2">
                {tender.contracting_authority && (
                  <span className={`flex items-center gap-1.5 text-xs text-slate-600 ${locked ? "blur-sm select-none opacity-80" : ""}`}>
                    <Building2 className="size-3.5 text-slate-400" />
                    <span className="truncate max-w-[280px] font-medium" title={tender.contracting_authority}>
                      {locked ? "Javno preduzeće Naručilac" : tender.contracting_authority}
                    </span>
                  </span>
                )}
                <span className={`flex items-center gap-1.5 text-xs ${deadline.className}`}>
                  <Clock className="size-3.5" />
                  {deadline.text}
                </span>
                {tender.estimated_value !== null && (
                  <span className={`flex items-center gap-1.5 text-xs font-bold font-mono ${locked ? "blur-sm select-none text-slate-500" : "text-slate-900"}`}>
                    <Banknote className={`size-3.5 ${locked ? "text-slate-400" : "text-emerald-600"}`} />
                    {locked ? "XXX.XXX,XX KM" : formatValue(tender.estimated_value)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: type badge + arrow */}
          <div className="flex shrink-0 items-center sm:flex-col sm:items-end justify-between gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
            {typeColor ? (
              <span className={`rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold ${typeColor}`}>
                {tender.contract_type}
              </span>
            ) : (
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-slate-600">
                Ostalo
              </span>
            )}
            
            {locked ? (
              <div className="hidden sm:flex size-8 items-center justify-center text-slate-300 transition-colors mt-1">
                <Lock className="size-4" />
              </div>
            ) : (
              <div className="hidden sm:flex size-8 items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors mt-1">
                <ArrowRight className="size-4" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
