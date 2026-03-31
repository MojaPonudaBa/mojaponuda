import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicCta } from "@/components/public/public-cta";
import { OpportunityStructuredData } from "@/components/public/opportunity-structured-data";
import { ArrowLeft, Calendar, MapPin, Building2, TrendingUp, AlertTriangle, Users } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("opportunities")
    .select("seo_title, seo_description, title, issuer")
    .eq("slug", `poticaj/${slug}`)
    .or(`slug.eq.tender/${slug}`)
    .maybeSingle();

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

  // Try both slug formats
  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*")
    .or(`slug.eq.poticaj/${slug},slug.eq.tender/${slug}`)
    .eq("published", true)
    .maybeSingle();

  if (!opportunity) notFound();

  // Related opportunities
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

  const difficultyLabel = { lako: "Lako", srednje: "Srednje", tesko: "Teško" };
  const difficultyColor = { lako: "text-emerald-700 bg-emerald-50", srednje: "text-amber-700 bg-amber-50", tesko: "text-red-700 bg-red-50" };

  return (
    <main className="min-h-screen bg-slate-50">
      <OpportunityStructuredData opportunity={opportunity} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/prilike" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-8">
          <ArrowLeft className="size-4" />
          Sve prilike
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {opportunity.type === "poticaj" ? "Poticaj / Grant" : "Javna nabavka"}
            </span>
            {opportunity.category && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {opportunity.category}
              </span>
            )}
            {opportunity.ai_difficulty && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${difficultyColor[opportunity.ai_difficulty as keyof typeof difficultyColor] ?? ""}`}>
                {difficultyLabel[opportunity.ai_difficulty as keyof typeof difficultyLabel]}
              </span>
            )}
          </div>

          <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl mb-4">
            {opportunity.title}
          </h1>

          {/* CTA above fold */}
          <PublicCta
            text="Provjeri ispunjava li tvoja firma uvjete"
            href={`/signup?ref=opportunity&id=${opportunity.id}`}
            variant="primary"
            className="mb-6"
          />

          {/* Meta */}
          <div className="grid gap-3 sm:grid-cols-2">
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
                  {daysLeft !== null && daysLeft > 0 && (
                    <span className={`ml-2 font-semibold ${daysLeft <= 7 ? "text-red-600" : "text-slate-700"}`}>
                      ({daysLeft} dana)
                    </span>
                  )}
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
        </div>

        {/* AI Analysis */}
        {opportunity.ai_summary && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 space-y-5">
            <h2 className="font-heading text-lg font-bold text-slate-900">Analiza prilike</h2>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Sažetak</p>
              <p className="text-sm leading-6 text-slate-700">{opportunity.ai_summary}</p>
            </div>

            {opportunity.ai_who_should_apply && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Kome je namijenjeno</p>
                <p className="text-sm leading-6 text-slate-700">{opportunity.ai_who_should_apply}</p>
              </div>
            )}

            {opportunity.ai_risks && (
              <div className="flex gap-3">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Rizici</p>
                  <p className="text-sm leading-6 text-slate-700">{opportunity.ai_risks}</p>
                </div>
              </div>
            )}

            {opportunity.ai_competition && (
              <div className="flex gap-3">
                <Users className="size-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Konkurencija</p>
                  <p className="text-sm leading-6 text-slate-700">{opportunity.ai_competition}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {opportunity.description && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-3">Opis</h2>
            <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">{opportunity.description}</p>
          </div>
        )}

        {/* Requirements */}
        {opportunity.requirements && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-3">Uvjeti prijave</h2>
            <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">{opportunity.requirements}</p>
          </div>
        )}

        {/* CTA after analysis */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 mb-6">
          <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">Pratite ovu priliku</h3>
          <p className="text-sm text-slate-600 mb-4">
            Prijavite se i pratite ovu i slične prilike. Dobijte obavijest kada se pojave novi uvjeti ili rok.
          </p>
          <div className="flex flex-wrap gap-3">
            <PublicCta text="Prati ovu priliku" href={`/signup?ref=follow&id=${opportunity.id}`} variant="primary" />
            <PublicCta text="Generiraj checklistu prijave" href={`/signup?ref=checklist&id=${opportunity.id}`} variant="secondary" />
          </div>
        </div>

        {/* Source */}
        <p className="text-xs text-slate-400 mb-8">
          Izvor: <a href={opportunity.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">{opportunity.source_url}</a>
        </p>

        {/* Related */}
        {(related ?? []).length > 0 && (
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-4">Slične prilike</h2>
            <div className="space-y-3">
              {(related ?? []).map((r) => (
                <Link
                  key={r.id}
                  href={`/prilike/${r.slug.split("/").pop()}`}
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
