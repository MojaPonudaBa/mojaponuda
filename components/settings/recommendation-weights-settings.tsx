"use client";

import { useMemo, useState, useTransition } from "react";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { updateRecommendationWeightsAction } from "@/app/actions/user-settings";
import { Button } from "@/components/ui/button";

export type RecommendationWeights = {
  industryFit: number;
  buyerHistory: number;
  similarProjects: number;
  tenderValue: number;
  deadline: number;
  competition: number;
};

type PreviewTender = {
  id: string;
  title: string;
  contracting_authority: string | null;
  estimated_value: number | null;
  deadline: string | null;
  procedure_type: string | null;
};

const LABELS: Record<keyof RecommendationWeights, string> = {
  industryFit: "Podudarnost djelatnosti",
  buyerHistory: "Historija sa naručiocem",
  similarProjects: "Slični projekti",
  tenderValue: "Vrijednost tendera",
  deadline: "Rok za prijavu",
  competition: "Konkurencija",
};

const DEFAULT_WEIGHTS: RecommendationWeights = {
  industryFit: 30,
  buyerHistory: 15,
  similarProjects: 20,
  tenderValue: 15,
  deadline: 10,
  competition: 10,
};

function normalizeWeights(value: Partial<RecommendationWeights> | null | undefined): RecommendationWeights {
  const merged = { ...DEFAULT_WEIGHTS, ...(value ?? {}) };
  const keys = Object.keys(DEFAULT_WEIGHTS) as Array<keyof RecommendationWeights>;
  const clamped = Object.fromEntries(keys.map((key) => [key, Math.max(0, Math.min(50, Math.round(Number(merged[key]) || 0)))])) as RecommendationWeights;
  const total = keys.reduce((sum, key) => sum + clamped[key], 0);
  if (total === 100) return clamped;
  return DEFAULT_WEIGHTS;
}

function daysUntil(value: string | null) {
  if (!value) return 45;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function scoreTender(tender: PreviewTender, weights: RecommendationWeights) {
  const valueScore = Math.min(100, Math.round(((tender.estimated_value ?? 0) / 500000) * 100));
  const deadlineDays = daysUntil(tender.deadline);
  const deadlineScore = deadlineDays < 0 ? 0 : deadlineDays <= 7 ? 92 : deadlineDays <= 21 ? 72 : 46;
  const procedureScore = tender.procedure_type?.toLowerCase().includes("otvoren") ? 74 : 58;
  const authorityScore = tender.contracting_authority ? 68 : 45;

  return Math.round(
    weights.industryFit * 0.82 +
      weights.buyerHistory * (authorityScore / 100) +
      weights.similarProjects * (procedureScore / 100) +
      weights.tenderValue * (valueScore / 100) +
      weights.deadline * (deadlineScore / 100) +
      weights.competition * 0.5,
  );
}

export function RecommendationWeightsSettings({
  initialWeights,
  previewTenders,
}: {
  initialWeights?: Partial<RecommendationWeights> | null;
  previewTenders: PreviewTender[];
}) {
  const [weights, setWeights] = useState(() => normalizeWeights(initialWeights));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const keys = Object.keys(DEFAULT_WEIGHTS) as Array<keyof RecommendationWeights>;
  const total = keys.reduce((sum, key) => sum + weights[key], 0);
  const canSave = total === 100 && keys.every((key) => weights[key] <= 50);

  const rankedPreview = useMemo(
    () =>
      [...previewTenders]
        .map((tender) => ({ tender, score: scoreTender(tender, weights) }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 5),
    [previewTenders, weights],
  );

  function updateWeight(key: keyof RecommendationWeights, value: number) {
    setWeights((current) => ({ ...current, [key]: Math.max(0, Math.min(50, value)) }));
    setMessage(null);
  }

  function save() {
    const formData = new FormData();
    keys.forEach((key) => formData.set(key, String(weights[key])));
    setMessage(null);
    startTransition(async () => {
      try {
        await updateRecommendationWeightsAction(formData);
        setMessage("Težine algoritma su sačuvane.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Težine nije moguće sačuvati.");
      }
    });
  }

  return (
    <section id="algoritam" className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-blue-600" />
            <h2 className="font-heading text-xl font-bold text-slate-950">Algoritam preporuka</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Podesite težine od 0 do 50%. Zbir mora biti tačno 100%, a preview ispod se re-rangira uživo.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${canSave ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          Ukupno {total}%
        </span>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {keys.map((key) => (
            <label key={key} className="block rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{LABELS[key]}</span>
                <span className="text-sm font-bold text-slate-950">{weights[key]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={weights[key]}
                onChange={(event) => updateWeight(key, Number(event.target.value))}
                className="w-full accent-blue-600"
              />
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={!canSave || isPending}>Sačuvaj algoritam</Button>
            <Button variant="outline" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Vrati default</Button>
            {message ? <p className="text-sm font-medium text-slate-600">{message}</p> : null}
          </div>
        </div>

        <aside className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Sparkles className="size-4" />
            <h3 className="font-heading text-base font-bold">Live re-rank preview</h3>
          </div>
          <div className="mt-4 space-y-3">
            {rankedPreview.length > 0 ? rankedPreview.map(({ tender, score }, index) => (
              <div key={tender.id} className="rounded-xl border border-blue-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-950">{index + 1}. {tender.title}</p>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{score}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{tender.contracting_authority ?? "Nepoznat naručilac"}</p>
              </div>
            )) : (
              <p className="text-sm leading-6 text-blue-800">Nema dovoljno tendera za preview.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
