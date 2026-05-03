"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Json } from "@/types/database";

interface AlertCreatorClientProps {
  initialInput?: string | null;
  initialParsed?: Json | null;
}

function formatParsedValue(value: Json | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .filter(([, item]) => item !== null && item !== "" && !(Array.isArray(item) && item.length === 0))
    .map(([key, item]) => ({
      key,
      value: Array.isArray(item) ? item.join(", ") : String(item),
    }));
}

/**
 * Client-side natural language alert parser wired to the existing alerts parse API.
 */
export function AlertCreatorClient({ initialInput, initialParsed }: AlertCreatorClientProps) {
  const [input, setInput] = useState(initialInput ?? "");
  const [parsed, setParsed] = useState<Json | null>(initialParsed ?? null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedRows = useMemo(() => formatParsedValue(parsed), [parsed]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Unesite opis alerta.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/alerts/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });
      const payload = (await response.json().catch(() => ({}))) as { parsed?: Json; cached?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nije moguce parsirati alert.");
      }

      setParsed(payload.parsed ?? null);
      setCached(Boolean(payload.cached));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nije moguce parsirati alert.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[var(--accent-ai-soft)] text-[var(--accent-ai-strong)]">
          <Sparkles className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Kreiraj alert prirodnim jezikom</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Opisite sta zelite pratiti, a sistem ce predloziti strukturirane uslove.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)]"
          placeholder="Npr. obavijesti me za IT tendere u Sarajevu preko 50.000 KM sa rokom duzim od 10 dana"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={loading} className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            Parsiraj alert
          </Button>
          {cached ? <span className="text-xs font-medium text-[var(--success-strong)]">Ucitano iz cache-a</span> : null}
          {error ? <span className="text-xs font-medium text-[var(--danger-strong)]">{error}</span> : null}
        </div>
      </form>

      <div className="mt-5 rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Parse preview</p>
        {parsedRows.length > 0 ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {parsedRows.map((row) => (
              <div key={row.key}>
                <dt className="text-xs font-medium text-[var(--text-tertiary)]">{row.key}</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Preview ce se prikazati nakon prvog parsiranja.</p>
        )}
      </div>
    </div>
  );
}
