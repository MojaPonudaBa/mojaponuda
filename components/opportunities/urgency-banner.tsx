"use client";

import { AlertTriangle, Clock, Ban } from "lucide-react";

export interface UrgencyConfig {
  days_until_deadline: number;
  urgency_level: "critical" | "high" | "medium" | "none" | "expired";
  color_scheme: {
    bg: string;
    border: string;
    text: string;
  };
  icon: "Clock" | "AlertTriangle" | "Ban";
  message: string;
}

interface UrgencyBannerProps {
  deadline: string | null;
  className?: string;
}

/**
 * Calculates urgency configuration based on deadline
 * @param deadline - Opportunity deadline (ISO string)
 * @returns Urgency configuration for UI rendering
 */
export function calculateUrgency(deadline: string | null): UrgencyConfig | null {
  if (!deadline) {
    return null;
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();

  // Set both to start of day for accurate day comparison
  deadlineDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - now.getTime();
  const days_until_deadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Expired
  if (days_until_deadline < 0) {
    return {
      days_until_deadline,
      urgency_level: "expired",
      color_scheme: {
        bg: "bg-red-50 dark:bg-red-950/20",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-900 dark:text-red-100",
      },
      icon: "Ban",
      message: "ROK ZA PRIJAVU JE ISTEKAO",
    };
  }

  // Critical (≤ 1 day)
  if (days_until_deadline <= 1) {
    const message =
      days_until_deadline === 0
        ? "⚡ ROK ISTJEČE DANAS"
        : "⚡ ROK ISTJEČE SUTRA";

    return {
      days_until_deadline,
      urgency_level: "critical",
      color_scheme: {
        bg: "bg-red-50 dark:bg-red-950/20",
        border: "border-red-300 dark:border-red-700",
        text: "text-red-900 dark:text-red-100",
      },
      icon: "AlertTriangle",
      message,
    };
  }

  // High (≤ 3 days)
  if (days_until_deadline <= 3) {
    return {
      days_until_deadline,
      urgency_level: "high",
      color_scheme: {
        bg: "bg-orange-50 dark:bg-orange-950/20",
        border: "border-orange-300 dark:border-orange-700",
        text: "text-orange-900 dark:text-orange-100",
      },
      icon: "AlertTriangle",
      message: `⚡ ROK ZA PRIJAVU ZA ${days_until_deadline} DANA`,
    };
  }

  // Medium (≤ 7 days)
  if (days_until_deadline <= 7) {
    return {
      days_until_deadline,
      urgency_level: "medium",
      color_scheme: {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        border: "border-amber-300 dark:border-amber-700",
        text: "text-amber-900 dark:text-amber-100",
      },
      icon: "Clock",
      message: `⏰ ROK ZA PRIJAVU ZA ${days_until_deadline} DANA`,
    };
  }

  // No urgency (> 7 days)
  return null;
}

/**
 * UrgencyBanner displays deadline urgency with appropriate styling
 */
export function UrgencyBanner({ deadline, className = "" }: UrgencyBannerProps) {
  const urgency = calculateUrgency(deadline);

  if (!urgency) {
    return null;
  }

  const IconComponent =
    urgency.icon === "Clock"
      ? Clock
      : urgency.icon === "AlertTriangle"
        ? AlertTriangle
        : Ban;

  return (
    <div
      className={`
        ${urgency.color_scheme.bg}
        ${urgency.color_scheme.border}
        ${urgency.color_scheme.text}
        border-2 rounded-lg p-4 mb-6
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <IconComponent className="w-6 h-6 flex-shrink-0" />
        <p className="font-semibold text-lg">{urgency.message}</p>
      </div>
    </div>
  );
}

/**
 * UrgencyBadge for use in opportunity cards (list views)
 */
export function UrgencyBadge({ deadline }: { deadline: string | null }) {
  const urgency = calculateUrgency(deadline);

  if (!urgency) {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
        ${urgency.color_scheme.bg}
        ${urgency.color_scheme.border}
        ${urgency.color_scheme.text}
        border
      `}
    >
      {urgency.urgency_level === "expired" ? (
        <Ban className="w-3 h-3" />
      ) : urgency.urgency_level === "critical" || urgency.urgency_level === "high" ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      {urgency.days_until_deadline === 0
        ? "Danas"
        : urgency.days_until_deadline === 1
          ? "Sutra"
          : urgency.days_until_deadline < 0
            ? "Isteklo"
            : `${urgency.days_until_deadline}d`}
    </span>
  );
}
