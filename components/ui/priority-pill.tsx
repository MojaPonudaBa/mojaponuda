import { AlertCircle, ArrowUp, Minus, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type PriorityLevel = "urgent" | "high" | "medium" | "low";

export interface PriorityPillProps {
  priority: PriorityLevel;
  className?: string;
  showIcon?: boolean;
}

const priorityConfig = {
  urgent: {
    label: "Hitno",
    icon: AlertCircle,
    className: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  },
  high: {
    label: "Visok",
    icon: TrendingUp,
    className: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  },
  medium: {
    label: "Srednji",
    icon: ArrowUp,
    className: "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]",
  },
  low: {
    label: "Nizak",
    icon: Minus,
    className: "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
  },
};

/**
 * Renders the tender priority level with a compact dashboard badge treatment.
 */
export function PriorityPill({ priority, className, showIcon = true }: PriorityPillProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {showIcon && <Icon className="size-3" aria-hidden="true" />}
      {config.label}
    </span>
  );
}

