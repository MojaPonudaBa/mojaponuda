"use client";

import { useState } from "react";
import { Brain, Check, Lightbulb, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AIInsightVariant = "default" | "suggestion" | "warning" | "success";
export type AIInsightFeedback = "positive" | "negative";

export interface AIInsightBoxProps {
  title?: string;
  children: React.ReactNode;
  variant?: AIInsightVariant;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  feedbackId?: string;
  className?: string;
}

const variantConfig = {
  default: {
    icon: Brain,
    className: "border-[var(--accent-ai-soft)] bg-[var(--accent-ai-soft)]/60 text-[var(--accent-ai-strong)]",
    titleClassName: "text-[var(--accent-ai-strong)]",
  },
  suggestion: {
    icon: Lightbulb,
    className: "border-[var(--primary-soft)] bg-[var(--primary-soft)]/70 text-[var(--primary-strong)]",
    titleClassName: "text-[var(--primary-strong)]",
  },
  warning: {
    icon: Sparkles,
    className: "border-[var(--warning-soft)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
    titleClassName: "text-[var(--warning-strong)]",
  },
  success: {
    icon: Check,
    className: "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success-strong)]",
    titleClassName: "text-[var(--success-strong)]",
  },
};

/**
 * Presents AI-generated guidance with optional action, dismissal, and local feedback controls.
 */
export function AIInsightBox({
  title = "AI preporuka",
  children,
  variant = "default",
  actionLabel,
  onAction,
  dismissible = false,
  onDismiss,
  feedbackId,
  className,
}: AIInsightBoxProps) {
  const [feedback, setFeedback] = useState<AIInsightFeedback | null>(null);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleFeedback = (value: AIInsightFeedback) => {
    setFeedback(value);
    if (feedbackId && typeof window !== "undefined") {
      window.localStorage.setItem(`ai-insight-feedback:${feedbackId}`, value);
    }
  };

  return (
    <aside className={cn("rounded-[var(--radius-card)] border p-4", config.className, className)}>
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)]/80">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn("text-sm font-semibold", config.titleClassName)}>{title}</h3>
            {dismissible && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6 text-current hover:bg-[var(--surface-1)]/70"
                onClick={onDismiss}
                aria-label="Zatvori AI preporuku"
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{children}</div>
          {(actionLabel || feedbackId) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {actionLabel && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onAction}
                  className="bg-[var(--accent-ai)] text-white hover:bg-[var(--accent-ai-strong)]"
                >
                  {actionLabel}
                </Button>
              )}
              {feedbackId && (
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      "text-current hover:bg-[var(--surface-1)]/70",
                      feedback === "positive" && "bg-[var(--surface-1)]/90",
                    )}
                    onClick={() => handleFeedback("positive")}
                    aria-label="Korisna preporuka"
                  >
                    <ThumbsUp className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      "text-current hover:bg-[var(--surface-1)]/70",
                      feedback === "negative" && "bg-[var(--surface-1)]/90",
                    )}
                    onClick={() => handleFeedback("negative")}
                    aria-label="Nekorisna preporuka"
                  >
                    <ThumbsDown className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

