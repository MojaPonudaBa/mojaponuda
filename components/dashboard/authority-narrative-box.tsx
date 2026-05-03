"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { EmptyState } from "@/components/ui/empty-state";

type NarrativePayload = {
  narrative?: string;
  summary?: string;
  text?: string;
  recommendations?: string[];
};

type AuthorityNarrativeBoxProps = {
  jib: string;
};

/** Loads the AI narrative for a contracting authority without changing the server data flow. */
export function AuthorityNarrativeBox({ jib }: AuthorityNarrativeBoxProps) {
  const [payload, setPayload] = useState<NarrativePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNarrative() {
      try {
        const response = await fetch(`/api/analytics/authority/${encodeURIComponent(jib)}/narrative`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error("AI narativ za ovog narucioca trenutno nije dostupan.");
        }

        const data = await response.json();

        if (active) {
          setPayload(data?.data ?? data);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "AI narativ nije dostupan.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNarrative();

    return () => {
      active = false;
    };
  }, [jib]);

  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--accent-ai-soft)] bg-[var(--accent-ai-soft)]/40 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-ai-strong)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI analiza se ucitava
        </div>
      </div>
    );
  }

  const narrative = payload?.narrative ?? payload?.summary ?? payload?.text;

  if (error || !narrative) {
    return (
      <EmptyState
        icon={Sparkles}
        title="AI narativ nije dostupan"
        description={error ?? "Nema dovoljno podataka za pouzdan narativ o ovom naruciocu."}
      />
    );
  }

  return (
    <AIInsightBox title="Zasto se dobija ili gubi kod ovog narucioca" variant="suggestion">
      <p>{narrative}</p>
      {payload?.recommendations?.length ? (
        <ul className="mt-3 space-y-1">
          {payload.recommendations.slice(0, 3).map((recommendation) => (
            <li key={recommendation}>- {recommendation}</li>
          ))}
        </ul>
      ) : null}
    </AIInsightBox>
  );
}

