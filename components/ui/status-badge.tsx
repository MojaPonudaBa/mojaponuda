import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TenderStatus =
  | "open"
  | "closing_soon"
  | "closed"
  | "awarded"
  | "cancelled"
  | "draft"
  | "submitted"
  | "won"
  | "lost"
  | "in_progress";

export interface StatusBadgeProps {
  status: TenderStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: {
    label: "Otvoren",
    className: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-strong)]",
  },
  closing_soon: {
    label: "Uskoro istice",
    className: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  },
  closed: {
    label: "Zatvoren",
    className: "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
  },
  awarded: {
    label: "Dodijeljen",
    className: "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]",
  },
  cancelled: {
    label: "Ponisten",
    className: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  },
  draft: {
    label: "Nacrt",
    className: "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
  },
  submitted: {
    label: "Predano",
    className: "border-[var(--info)] bg-[var(--info-soft)] text-[var(--info-strong)]",
  },
  won: {
    label: "Dobijeno",
    className: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-strong)]",
  },
  lost: {
    label: "Izgubljeno",
    className: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  },
  in_progress: {
    label: "U toku",
    className: "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]",
  },
};

function humanizeStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Wraps the existing shadcn Badge with tender and bid status-specific styling.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: humanizeStatus(status),
    className: "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
  };

  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-full border px-2.5 py-0.5 text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

