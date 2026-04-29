import { Clock, AlertTriangle, CalendarCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DeadlineCountdownProps {
  deadline: string | Date;
  className?: string;
  compact?: boolean;
}

function getDaysRemaining(deadline: string | Date) {
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineState(days: number | null) {
  if (days === null) {
    return {
      label: "Nepoznat rok",
      className: "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
      icon: Clock,
    };
  }

  if (days < 0) {
    return {
      label: "Rok istekao",
      className: "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
      icon: CalendarCheck,
    };
  }

  if (days <= 3) {
    return {
      label: days === 0 ? "Danas" : `${days} dana`,
      className: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-strong)]",
      icon: AlertTriangle,
    };
  }

  if (days <= 7) {
    return {
      label: `${days} dana`,
      className: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
      icon: Clock,
    };
  }

  return {
    label: `${days} dana`,
    className: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-strong)]",
    icon: Clock,
  };
}

/**
 * Shows how much time remains before a tender deadline using dashboard status tokens.
 */
export function DeadlineCountdown({ deadline, className, compact = false }: DeadlineCountdownProps) {
  const daysRemaining = getDaysRemaining(deadline);
  const state = getDeadlineState(daysRemaining);
  const Icon = state.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        state.className,
        compact && "gap-1 px-2 py-0.5 text-[11px]",
        className,
      )}
    >
      <Icon className={cn("size-3.5", compact && "size-3")} aria-hidden="true" />
      <span>{state.label}</span>
    </div>
  );
}

