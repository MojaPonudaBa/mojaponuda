import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OpportunityStructuredData } from "@/components/public/opportunity-structured-data";
import { ArticleContent } from "@/components/public/article-content";
import { OpportunityActionsWrapper } from "@/components/dashboard/opportunity-actions-wrapper";
import { ArrowLeft, Calendar, MapPin, Building2, TrendingUp, ExternalLink, Ban } from "lucide-react";
import type { Database } from "@/types/database";

type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];

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

export default async function OpportunityPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*")
    .or(`slug.eq.poticaj/${slug},slug.eq.tender/${slug}`)
    .eq("published", true)
    .maybeSingle() as { data: OpportunityRow | null };

  if (!opportunity) notFound();

  const { data: related } = await supabase
    .from("opportunities")
    .select("id, slug, title, issuer, deadline, type")
    .eq("published", true)
    .eq("status", "active")
    .eq("category", opportunity.category ?? "")
    .neq("id", opportunity.id)
    .limit(3);

  const formatValue = (v: number | null) => {
    if (!v) return null;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M KM`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K KM`;
    return `${v} KM`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" });
  };

  const daysLeft = opportunity.deadline
    ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const difficultyLabel: Record<string, string> = { lako: "Lako", srednje: "Srednje", tesko: "Teško" };
  const difficultyColor: Record<string, string> = {
    lako: "text-emerald-700 bg-emerald-50",
    srednje: "text-amber-700 bg-amber-50",
    tesko: "text-red-700 bg-red-50",
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <OpportunityStructuredData opportunity={opportunity} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/prilike" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-8">
          <ArrowLeft className="size-4" />
          Sve prilike
        </Link>

        {/* Header card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {opportunity.type === "poticaj" ? "Poticaj / Grant" : "Javna nabavka"}
            </span>
            {opportunity.category && (
              <Link
                href={`/prilike?kategorija=${encodeURIComponent(opportunity.category)}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {opportunity.category}
              </Link>
            )}
            {opportunity.ai_difficulty && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${difficultyColor[opportunity.ai_difficulty] ?? ""}`}>
                {difficultyLabel[opportunity.ai_difficulty] ?? opportunity.ai_difficulty}
              </span>
            )}
          </div>

          <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl mb-4">
            {opportunity.title}
          </h1>

          {daysLeft !== null && daysLeft <= 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-4">
              <Ban className="size-4 text-red-600 shrink-0" />
              <p className="text-sm font-semibold text-red-700">ROK ZA PRIJAVU JE ISTEKAO</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="size-4 text-slate-400 shrink-0" />
              <span>{opportunity.issuer}</span>
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
                  {daysLeft !== null && daysLeft > 0 ? (
                    <span className={`ml-2 font-semibold ${daysLeft <= 7 ? "text-red-600" : "text-slate-700"}`}>
                      ({daysLeft} dana)
                    </span>
                  ) : daysLeft !== null && daysLeft <= 0 ? (
                    <span className="ml-2 font-semibold text-red-600">(Istekao)</span>
                  ) : null}
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

          {/* Primary CTA — follow */}
          <OpportunityActionsWrapper
            opportunityId={opportunity.id}
            signupHref={`/signup?ref=follow&id=${opportunity.id}`}
          />
        </div>

        {/* Quick analysis strip */}
        {opportunity.ai_summary && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 space-y-3">
            <p className="text-sm leading-6 text-slate-700">{opportunity.ai_summary}</p>
            {opportunity.ai_who_should_apply && (
              <p className="text-xs text-slate-500 leading-5">
                <span className="font-semibold text-slate-700">Kome je namijenjeno: </span>
                {opportunity.ai_who_should_apply}
              </p>
            )}
          </div>
        )}

        {/* Main article content (AI-generated SEO post) */}
        {(opportunity as OpportunityRow & { ai_content?: string | null }).ai_content && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <ArticleContent content={(opportunity as OpportunityRow & { ai_content?: string | null }).ai_content!} />
          </div>
        )}

        {/* Mid-content CTA */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 mb-6">
          <p className="text-sm font-semibold text-slate-900 mb-1">Pratite rokove, ne propustite prijavu</p>
          <p className="text-xs text-slate-600 mb-4">
            Dodajte ovu priliku u praćene i bit ćete obaviješteni o svim promjenama roka i uvjeta.
            Pogledajte i{" "}
            <Link href="/prilike" className="text-blue-700 underline hover:text-blue-900">
              sve aktivne prilike na MojaPonuda.ba
            </Link>.
          </p>
          <OpportunityActionsWrapper
            opportunityId={opportunity.id}
            signupHref={`/signup?ref=follow&id=${opportunity.id}`}
          />
        </div>

        <p className="text-xs text-slate-400 mb-8 flex items-center gap-1.5">
          <ExternalLink className="size-3 shrink-0" />
          Izvor:{" "}
          <a href={opportunity.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 truncate">
            {opportunity.source_url}
          </a>
        </p>

        {/* Related opportunities — internal backlinks */}
        {(related ?? []).length > 0 && (
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-1">Slične prilike</h2>
            <p className="text-xs text-slate-500 mb-4">
              Više{opportunity.category ? ` sličnih poziva u kategoriji ${opportunity.category}` : " javnih poziva i grantova"} dostupno je na{" "}
              <Link href="/prilike" className="text-blue-700 underline hover:text-blue-900">MojaPonuda.ba</Link>.
            </p>
            <div className="space-y-3">
              {(related ?? []).map((r) => (
                <Link
                  key={r.id}
                  href={`/prilike/${(r.slug as string).split("/").pop()}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{r.issuer}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
