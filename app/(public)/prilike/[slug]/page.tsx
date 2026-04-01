import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OpportunityStructuredData } from "@/components/public/opportunity-structured-data";
import { ArticleContent } from "@/components/public/article-content";
import { OpportunityActionsWrapper } from "@/components/dashboard/opportunity-actions-wrapper";
import { getCategoryByDbName } from "@/lib/opportunity-categories";
import {
  ArrowLeft, Calendar, MapPin, Building2, TrendingUp, ExternalLink,
  Ban, ChevronRight, BarChart2, Clock, ArrowUpRight,
} from "lucide-react";
import type { Database } from "@/types/database";

type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];
type RelatedRow = Pick<OpportunityRow, "id" | "slug" | "title" | "issuer" | "deadline" | "type" | "location" | "category" | "ai_difficulty" | "value">;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("opportunities")
    .select("seo_title, seo_description, title, issuer")
    .or(`slug.eq.poticaj/${slug},slug.eq.tender/${slug}`)
    .maybeSingle() as { data: Pick<OpportunityRow, "seo_title" | "seo_description" | "title" | "issuer"> | null };

  if (!data) return { title: "Prilika | MojaPonuda.ba" };

  return {
    title: data.seo_title ?? `${data.title} | MojaPonuda.ba`,
    description: data.seo_description ?? `${data.title} — ${data.issuer}`,
    alternates: { canonical: `https://mojaponuda.ba/prilike/${slug}` },
  };
}

export const revalidate = 3600;

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatValue(v: number | null) {
  if (!v) return null;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M KM`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K KM`;
  return `${v} KM`;
}
function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" });
}
function oppSlug(slug: string) {
  return slug.split("/").pop() ?? slug;
}
function scoreRelated(r: RelatedRow, opp: OpportunityRow): number {
  let s = 0;
  if (r.category === opp.category) s += 3;
  if (r.location && opp.location && r.location === opp.location) s += 2;
  if (r.type === opp.type) s += 1;
  return s;
}

const difficultyLabel: Record<string, string> = { lako: "Lako", srednje: "Srednje", tesko: "Teško" };
const difficultyColor: Record<string, string> = {
  lako: "text-emerald-700 bg-emerald-50",
  srednje: "text-amber-700 bg-amber-50",
  tesko: "text-red-700 bg-red-50",
};

export default async function OpportunityPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // ── Main opportunity ──────────────────────────────────────────────────────
  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*")
    .or(`slug.eq.poticaj/${slug},slug.eq.tender/${slug}`)
    .eq("published", true)
    .maybeSingle() as { data: OpportunityRow | null };

  if (!opportunity) notFound();

  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  // ── Parallel fetches (Layers 2, 3, 4) ────────────────────────────────────
  const [
    { data: candidateRelated },
    { data: pastFromIssuer },
    { count: trendCount },
  ] = await Promise.all([
    // Layer 2: candidates for smart-related (same category, up to 10)
    supabase
      .from("opportunities")
      .select("id, slug, title, issuer, deadline, type, location, category, ai_difficulty, value")
      .eq("published", true)
      .eq("status", "active")
      .eq("category", opportunity.category ?? "")
      .neq("id", opportunity.id)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(10),

    // Layer 3: temporal — other published opportunities from same issuer
    supabase
      .from("opportunities")
      .select("id, slug, title, issuer, deadline, type")
      .eq("published", true)
      .eq("issuer", opportunity.issuer)
      .neq("id", opportunity.id)
      .order("created_at", { ascending: false })
      .limit(3),

    // Layer 4: trend — count in same category last 6 months
    supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("published", true)
      .eq("category", opportunity.category ?? "")
      .gte("created_at", sixMonthsAgo),
  ]);

  // Layer 2: score + deduplicate → top 4
  const smartRelated: RelatedRow[] = (candidateRelated ?? [])
    .map((r) => ({ ...r, _score: scoreRelated(r, opportunity) }))
    .sort((a, b) => (b as RelatedRow & { _score: number })._score - (a as RelatedRow & { _score: number })._score)
    .slice(0, 4);

  // Resolve SEO category for breadcrumb + links
  const seoCategory = getCategoryByDbName(opportunity.category);

  const daysLeft = opportunity.deadline
    ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpired = daysLeft !== null && daysLeft <= 0;
  const aiContent = (opportunity as OpportunityRow & { ai_content?: string | null }).ai_content;

  return (
    <main className="min-h-screen bg-slate-50">
      <OpportunityStructuredData opportunity={opportunity} />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* ── Layer 1: Breadcrumb ────────────────────────────────────────── */}
        <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
          <Link href="/" className="hover:text-slate-700 transition-colors">Početna</Link>
          <ChevronRight className="size-3 shrink-0" />
          <Link href="/prilike" className="hover:text-slate-700 transition-colors">Prilike</Link>
          {seoCategory && (
            <>
              <ChevronRight className="size-3 shrink-0" />
              <Link href={`/prilike/kategorija/${seoCategory.slug}`} className="hover:text-slate-700 transition-colors">
                {seoCategory.title}
              </Link>
            </>
          )}
          <ChevronRight className="size-3 shrink-0" />
          <span className="text-slate-600 truncate max-w-[200px]">{opportunity.title}</span>
        </nav>

        {/* ── Header card ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm mb-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {opportunity.type === "poticaj" ? "Poticaj / Grant" : "Javna nabavka"}
            </span>
            {seoCategory ? (
              <Link
                href={`/prilike/kategorija/${seoCategory.slug}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {seoCategory.title}
              </Link>
            ) : opportunity.category ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {opportunity.category}
              </span>
            ) : null}
            {opportunity.ai_difficulty && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${difficultyColor[opportunity.ai_difficulty] ?? ""}`}>
                {difficultyLabel[opportunity.ai_difficulty] ?? opportunity.ai_difficulty}
              </span>
            )}
          </div>

          <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl mb-4">
            {opportunity.title}
          </h1>

          {isExpired && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-4">
              <Ban className="size-4 text-red-600 shrink-0" />
              <p className="text-sm font-semibold text-red-700">ROK ZA PRIJAVU JE ISTEKAO</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="size-4 text-slate-400 shrink-0" />
              <span className="truncate">{opportunity.issuer}</span>
            </div>
            {opportunity.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="size-4 text-slate-400 shrink-0" />
                <span>{opportunity.location}</span>
              </div>
            )}
            {opportunity.deadline && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="size-4 text-slate-400 shrink-0" />
                <span>
                  Rok: {formatDate(opportunity.deadline)}
                  {daysLeft !== null && daysLeft > 0 && (
                    <span className={`ml-2 font-semibold ${daysLeft <= 7 ? "text-red-600" : "text-slate-700"}`}>
                      ({daysLeft} {daysLeft === 1 ? "dan" : "dana"})
                    </span>
                  )}
                  {isExpired && <span className="ml-2 font-semibold text-red-600">(Istekao)</span>}
                </span>
              </div>
            )}
            {opportunity.value && (
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <TrendingUp className="size-4 shrink-0" />
                <span>{formatValue(opportunity.value)}</span>
              </div>
            )}
          </div>

          {/* CTA #1 — primary follow action */}
          <OpportunityActionsWrapper
            opportunityId={opportunity.id}
            signupHref={`/signup?ref=follow&id=${opportunity.id}`}
          />
        </div>

        {/* ── Layer 4: Trend insight strip ──────────────────────────────── */}
        {(trendCount ?? 0) > 1 && opportunity.category && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 mb-5 flex items-center gap-3">
            <BarChart2 className="size-4 text-blue-500 shrink-0" />
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{trendCount}</span> sličnih poziva objavljeno u ovoj kategoriji u zadnjih 6 mjeseci.{" "}
              {seoCategory && (
                <Link href={`/prilike/kategorija/${seoCategory.slug}`} className="text-blue-600 hover:underline font-medium">
                  Pogledaj sve →
                </Link>
              )}
            </p>
          </div>
        )}

        {/* ── AI Summary strip ──────────────────────────────────────────── */}
        {opportunity.ai_summary && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-5 space-y-2">
            <p className="text-sm leading-6 text-slate-700">{opportunity.ai_summary}</p>
            {opportunity.ai_who_should_apply && (
              <p className="text-xs text-slate-500 leading-5">
                <span className="font-semibold text-slate-700">Kome je namijenjeno: </span>
                {opportunity.ai_who_should_apply}
              </p>
            )}
          </div>
        )}

        {/* ── AI Content (SEO article) ──────────────────────────────────── */}
        {aiContent && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-5">
            <ArticleContent content={aiContent} />
          </div>
        )}

        {/* ── CTA #2 — mid-content conversion banner ────────────────────── */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 mb-5">
          <p className="text-sm font-semibold text-slate-900 mb-1">
            {isExpired
              ? "Pratite sljedeće slične prilike"
              : "Ne propustite rok za prijavu"}
          </p>
          <p className="text-xs text-slate-600 mb-4 leading-5">
            {isExpired
              ? `Ovaj poziv je istekao, ali slične prilike se redovno objavljuju. `
              : `Prati ovu i slične prilike i nikad ne propusti rok. `}
            {seoCategory ? (
              <>
                Sve prilike u kategoriji{" "}
                <Link href={`/prilike/kategorija/${seoCategory.slug}`} className="text-blue-700 underline hover:text-blue-900 font-medium">
                  {seoCategory.title}
                </Link>{" "}
                dostupne su na MojaPonuda.ba.
              </>
            ) : (
              <>
                Sve prilike dostupne su na{" "}
                <Link href="/prilike" className="text-blue-700 underline hover:text-blue-900">MojaPonuda.ba</Link>.
              </>
            )}
          </p>
          {!isExpired && (
            <OpportunityActionsWrapper
              opportunityId={opportunity.id}
              signupHref={`/signup?ref=category&cat=${encodeURIComponent(opportunity.category ?? "")}`}
            />
          )}
          {isExpired && seoCategory && (
            <Link
              href={`/prilike/kategorija/${seoCategory.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Aktivne prilike — {seoCategory.title}
              <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* ── Layer 3: Temporal — past/other from same issuer ───────────── */}
        {(pastFromIssuer ?? []).length > 0 && (
          <div className="mb-5">
            <h2 className="font-heading text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="size-4 text-slate-400" />
              Drugi pozivi od {opportunity.issuer}
            </h2>
            <div className="space-y-2">
              {(pastFromIssuer ?? []).map((r) => {
                const rDays = r.deadline
                  ? Math.ceil((new Date(r.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <Link
                    key={r.id}
                    href={`/prilike/${oppSlug(r.slug as string)}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">{r.title}</p>
                      {r.deadline && (
                        <p className={`text-xs mt-0.5 ${rDays !== null && rDays <= 0 ? "text-red-500" : rDays !== null && rDays <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                          {rDays !== null && rDays <= 0 ? "Istekao" : rDays !== null ? `Rok: ${rDays} dana` : formatDate(r.deadline)}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight className="size-3.5 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Layer 2: Smart related ────────────────────────────────────── */}
        {smartRelated.length > 0 && (
          <div className="mb-5">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-1">Slične prilike</h2>
            <p className="text-xs text-slate-500 mb-3">
              Odabrano prema kategoriji, lokaciji i tipu poziva.
            </p>
            <div className="space-y-2">
              {smartRelated.map((r) => {
                const rDays = r.deadline
                  ? Math.ceil((new Date(r.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <Link
                    key={r.id}
                    href={`/prilike/${oppSlug(r.slug as string)}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:shadow-sm transition-all group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                          {r.type === "poticaj" ? "Poticaj" : "Nabavka"}
                        </span>
                        {r.ai_difficulty && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${difficultyColor[r.ai_difficulty] ?? ""}`}>
                            {difficultyLabel[r.ai_difficulty]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">{r.title}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                        <span>{r.issuer}</span>
                        {r.value && <span className="text-emerald-600 font-semibold">{formatValue(r.value)}</span>}
                        {rDays !== null && (
                          <span className={rDays <= 0 ? "text-red-500 font-semibold" : rDays <= 7 ? "text-amber-500 font-semibold" : ""}>
                            {rDays <= 0 ? "Istekao" : `${rDays} dana`}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 text-slate-300 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CTA #3 — bottom category link ────────────────────────────── */}
        {seoCategory && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Sve prilike u kategoriji <span className="font-semibold text-slate-900">{seoCategory.title}</span>
            </p>
            <Link
              href={`/prilike/kategorija/${seoCategory.slug}`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Pogledaj sve
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        )}

        {/* ── Source attribution ───────────────────────────────────────── */}
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <ExternalLink className="size-3 shrink-0" />
          Izvor:{" "}
          <a
            href={opportunity.source_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 truncate"
          >
            {opportunity.source_url}
          </a>
        </p>

      </div>
    </main>
  );
}
