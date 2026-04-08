"use client";

import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin, TrendingUp } from "lucide-react";
import { FollowButton } from "./opportunity-actions";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const REFERENCE_NOW = Date.now();

interface Props {
  opportunity: {
    id: string;
    slug: string;
    type: string;
    title: string;
    issuer: string;
    category: string | null;
    value: number | null;
    deadline: string | null;
    location: string | null;
    ai_summary: string | null;
    ai_difficulty: string | null;
  };
}

const difficultyColor: Record<string, string> = {
  lako: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  srednje: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  tesko: "border-rose-500/25 bg-rose-500/10 text-rose-100",
};

function formatValue(value: number | null) {
  if (!value) return null;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value} KM`;
}

export function OpportunityDashboardCard({ opportunity }: Props) {
  const slug = opportunity.slug.split("/").pop() ?? opportunity.slug;
  const daysLeft = opportunity.deadline
    ? Math.ceil((new Date(opportunity.deadline).getTime() - REFERENCE_NOW) / DAY_IN_MS)
    : null;

  return (
    <article className="rounded-[1.5rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5 text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
              {opportunity.type === "poticaj" ? "Poticaj" : "Nabavka"}
            </span>
            {opportunity.ai_difficulty ? (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${difficultyColor[opportunity.ai_difficulty] ?? "border-white/10 bg-white/5 text-slate-200"}`}>
                {opportunity.ai_difficulty === "lako" ? "Lako" : opportunity.ai_difficulty === "srednje" ? "Srednje" : "Teško"}
              </span>
            ) : null}
            {daysLeft !== null && daysLeft <= 0 ? (
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-100">
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
          {opportunity.ai_summary ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{opportunity.ai_summary}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
            {opportunity.location ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-slate-500" />
                {opportunity.location}
              </span>
            ) : null}
            {opportunity.deadline ? (
              <span className={`inline-flex items-center gap-2 ${daysLeft !== null && daysLeft <= 7 ? "text-amber-100" : ""}`}>
                <Calendar className="size-4 shrink-0 text-slate-500" />
                {daysLeft !== null && daysLeft <= 0 ? "Istekao" : daysLeft !== null && daysLeft > 0 ? `${daysLeft} dana` : "Uskoro"}
              </span>
            ) : null}
            {opportunity.value ? (
              <span className="inline-flex items-center gap-2 font-semibold text-emerald-200">
                <TrendingUp className="size-4 shrink-0 text-emerald-300" />
                {formatValue(opportunity.value)}
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <FollowButton opportunityId={opportunity.id} />
          </div>
        </div>

        <Link href={`/prilike/${slug}`} className="shrink-0">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:text-white">
            <ArrowUpRight className="size-4" />
          </div>
        </Link>
      </div>
    </article>
  );
}
