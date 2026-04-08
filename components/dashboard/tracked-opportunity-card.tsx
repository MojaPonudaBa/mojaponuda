"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Loader2,
  MapPin,
  RotateCcw,
  ThumbsDown,
  Trophy,
  TrendingUp,
  X,
} from "lucide-react";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const REFERENCE_NOW = Date.now();

interface TrackedOpportunity {
  followId: string;
  outcome: "won" | "lost" | null;
  followedAt: string;
  opportunity: {
    id: string;
    slug: string;
    type: string;
    title: string;
    issuer: string;
    deadline: string | null;
    value: number | null;
    location: string | null;
    ai_summary: string | null;
    ai_difficulty: string | null;
  };
}

interface Props {
  follow: TrackedOpportunity;
}

function formatValue(value: number | null) {
  if (!value) return null;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value} KM`;
}

export function TrackedOpportunityCard({ follow: initialFollow }: Props) {
  const [follow, setFollow] = useState(initialFollow);
  const [loading, setLoading] = useState<string | null>(null);

  const opportunity = follow.opportunity;
  const slug = opportunity.slug.split("/").pop() ?? opportunity.slug;
  const daysLeft = opportunity.deadline
    ? Math.ceil((new Date(opportunity.deadline).getTime() - REFERENCE_NOW) / DAY_IN_MS)
    : null;
  const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const outcomeConfig = {
    won: {
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
      card: "border-emerald-500/20 bg-emerald-500/5",
      label: "Dobijeno",
    },
    lost: {
      badge: "border-slate-500/25 bg-slate-500/10 text-slate-200",
      card: "border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]",
      label: "Izgubljeno",
    },
  };

  const cardTone = follow.outcome
    ? outcomeConfig[follow.outcome].card
    : isUrgent
      ? "border-amber-500/25 bg-amber-500/5"
      : "border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]";

  async function setOutcome(outcome: "won" | "lost" | null) {
    setLoading(outcome ?? "reset");
    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}/follow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (response.ok) setFollow((current) => ({ ...current, outcome }));
    } catch {}
    setLoading(null);
  }

  async function unfollow() {
    setLoading("unfollow");
    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}/follow`, { method: "DELETE" });
      if (response.ok) setFollow((current) => ({ ...current, outcome: "lost" as const }));
    } catch {}
    setLoading(null);
  }

  return (
    <article className={`rounded-[1.5rem] border p-5 text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)] ${cardTone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
              {opportunity.type === "poticaj" ? "Poticaj" : "Nabavka"}
            </span>
            {follow.outcome ? (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${outcomeConfig[follow.outcome].badge}`}>
                {outcomeConfig[follow.outcome].label}
              </span>
            ) : null}
            {!follow.outcome && isUrgent ? (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                Ističe uskoro
              </span>
            ) : null}
            {!follow.outcome && isExpired ? (
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-100">
                Rok istekao
              </span>
            ) : null}
          </div>

          <Link href={`/prilike/${slug}`} className="group">
            <h3 className="line-clamp-2 text-lg font-semibold leading-7 text-white transition-colors group-hover:text-sky-200">
              {opportunity.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-slate-400">{opportunity.issuer}</p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
            {opportunity.location ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-slate-500" />
                {opportunity.location}
              </span>
            ) : null}
            {opportunity.deadline ? (
              <span className={`inline-flex items-center gap-2 ${isExpired ? "text-rose-100" : isUrgent ? "text-amber-100" : ""}`}>
                <Calendar className="size-4 shrink-0 text-slate-500" />
                {isExpired
                  ? "Rok istekao"
                  : daysLeft !== null && daysLeft > 0
                    ? `${daysLeft} dana`
                    : new Date(opportunity.deadline).toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit" })}
              </span>
            ) : null}
            {opportunity.value ? (
              <span className="inline-flex items-center gap-2 font-semibold text-emerald-200">
                <TrendingUp className="size-4 shrink-0 text-emerald-300" />
                {formatValue(opportunity.value)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {follow.outcome === null ? (
              <>
                <button
                  onClick={() => setOutcome("won")}
                  disabled={!!loading}
                  className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {loading === "won" ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
                  Dobijeno
                </button>
                <button
                  onClick={() => setOutcome("lost")}
                  disabled={!!loading}
                  className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {loading === "lost" ? <Loader2 className="size-4 animate-spin" /> : <ThumbsDown className="size-4" />}
                  Izgubljeno
                </button>
              </>
            ) : (
              <button
                onClick={() => setOutcome(null)}
                disabled={!!loading}
                className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                {loading === "reset" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                Vrati u praćenje
              </button>
            )}

            <button
              onClick={unfollow}
              disabled={!!loading}
              className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/20 hover:text-rose-50 disabled:opacity-50"
            >
              {loading === "unfollow" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Ukloni
            </button>
          </div>
        </div>

        <Link href={`/prilike/${slug}`} className="shrink-0 text-sm font-semibold text-sky-300 hover:text-sky-200">
          Otvori
        </Link>
      </div>
    </article>
  );
}
