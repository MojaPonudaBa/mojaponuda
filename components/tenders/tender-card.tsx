import Link from "next/link";
import type { Tender } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Clock,
  Building2,
  Tag,
  Banknote,
  ArrowRight,
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
    return { text: "Bez roka", className: "text-muted-foreground", dotClass: "bg-muted-foreground/40", urgent: false };

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { text: `Istekao`, className: "text-muted-foreground/60 line-through", dotClass: "bg-muted-foreground/30", urgent: false };
  if (diffDays <= 3)
    return { text: `${diffDays}d`, className: "text-red-400 font-bold", dotClass: "bg-red-500 animate-pulse", urgent: true };
  if (diffDays <= 7)
    return { text: `${diffDays} dana`, className: "text-red-400 font-medium", dotClass: "bg-red-400", urgent: true };
  if (diffDays <= 14)
    return { text: formatDate(deadline), className: "text-amber-400", dotClass: "bg-amber-400", urgent: false };
  return { text: formatDate(deadline), className: "text-foreground/80", dotClass: "bg-emerald-400", urgent: false };
}

const TYPE_COLORS: Record<string, string> = {
  Robe: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Usluge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Radovi: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function TenderCard({ tender }: TenderCardProps) {
  const deadline = getDeadlineStatus(tender.deadline);
  const typeColor = tender.contract_type
    ? TYPE_COLORS[tender.contract_type] ?? "bg-muted text-muted-foreground border-border"
    : null;

  return (
    <Link href={`/dashboard/tenders/${tender.id}`} className="group block">
      <Card className="relative overflow-hidden border-border bg-card transition-all duration-200 hover:border-primary/30 hover:bg-card/80">
        {/* Left accent stripe */}
        <div className={`absolute inset-y-0 left-0 w-0.5 ${deadline.dotClass.replace("animate-pulse", "")}`} />

        <CardContent className="flex items-start gap-4 p-4 pl-5">
          <div className="min-w-0 flex-1 space-y-2.5">
            {/* Title */}
            <p className="text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {tender.title}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {tender.contracting_authority && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{tender.contracting_authority}</span>
                </span>
              )}
              <span className={`flex items-center gap-1.5 text-xs ${deadline.className}`}>
                <Clock className="size-3 shrink-0" />
                {deadline.text}
              </span>
              {tender.estimated_value !== null && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-400/80">
                  <Banknote className="size-3 shrink-0" />
                  {formatValue(tender.estimated_value)}
                </span>
              )}
            </div>
          </div>

          {/* Right side: type badge + arrow */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            {typeColor && (
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeColor}`}>
                {tender.contract_type}
              </span>
            )}
            <ArrowRight className="size-3.5 text-muted-foreground/0 transition-all group-hover:text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
