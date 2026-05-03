"use client";

import { Lightbulb, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { EmptyState } from "@/components/ui/empty-state";

type Insight = {
  title?: string;
  insight?: string;
  description?: string;
  recommendation?: string;
};

/** Fetches and renders AI-backed analytics insights for the Trziste page. */
export function AnalyticsInsightsCards() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInsights() {
      try {
        const response = await fetch("/api/analytics/insights", {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error("AI uvidi trenutno nisu dostupni.");
        }

        const payload = await response.json();
        const nextInsights = Array.isArray(payload?.insights)
          ? payload.insights
          : Array.isArray(payload?.data?.insights)
            ? payload.data.insights
            : [];

        if (active) {
          setInsights(nextInsights.slice(0, 3));
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "AI uvidi trenutno nisu dostupni.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInsights();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="min-h-36 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
            <div className="mt-6 h-3 w-2/3 rounded-full bg-[var(--surface-2)]" />
            <div className="mt-3 h-3 w-full rounded-full bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error || insights.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="AI uvidi nisu dostupni"
        description={error ?? "Nema dovoljno podataka za automatske uvide."}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {insights.map((insight, index) => (
        <AIInsightBox key={`${insight.title ?? "insight"}-${index}`} title={insight.title ?? `Uvid ${index + 1}`} variant="suggestion">
          <p>{insight.insight ?? insight.description ?? "Nema dodatnog opisa."}</p>
          {insight.recommendation ? <p className="mt-3 font-medium">{insight.recommendation}</p> : null}
        </AIInsightBox>
      ))}
    </div>
  );
}

