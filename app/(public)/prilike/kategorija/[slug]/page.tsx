import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OpportunityCard } from "@/components/public/opportunity-card";
import { PublicCta } from "@/components/public/public-cta";
import { getCategoryBySlug, getAllCategorySlugs, OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-categories";
import { ArrowLeft, Tag } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Kategorija | MojaPonuda.ba" };

  return {
    title: category.metaTitle,
    description: category.metaDescription,
    alternates: { canonical: `https://mojaponuda.ba/prilike/kategorija/${slug}` },
    openGraph: {
      title: category.metaTitle,
      description: category.metaDescription,
      url: `https://mojaponuda.ba/prilike/kategorija/${slug}`,
    },
  };
}

export const revalidate = 3600;

export default async function KategorijaPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const supabase = await createClient();

  // All public category pages are poticaji-only
  let query = supabase
    .from("opportunities")
    .select("id, slug, type, title, issuer, category, value, deadline, location, ai_summary, ai_difficulty")
    .eq("published", true)
    .eq("status", "active")
    .eq("type", "poticaj")
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(40);

  if (category.dbCategories.length > 0) {
    query = query.in("category", category.dbCategories);
  }

  const { data: opportunities } = await query;
  const filtered = opportunities ?? [];

  // Related categories (exclude current)
  const relatedCategories = OPPORTUNITY_CATEGORIES.filter((c) => c.slug !== slug).slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/prilike" className="hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="size-3.5" />
            Poticaji
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{category.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="size-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              {category.type === "poticaj" ? "Poticaji i grantovi" : category.type === "tender" ? "Javne nabavke" : "Prilike"}
            </span>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
            {category.h1}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            {category.description}
          </p>
          <PublicCta
            text="Pratite prilike prilagođene vašoj firmi"
            href="/signup"
            className="mt-6"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="mb-16 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <p className="text-slate-500 mb-2">Trenutno nema aktivnih prilike u ovoj kategoriji.</p>
            <p className="text-sm text-slate-400">Prilike se ažuriraju svakodnevno. Prijavite se za obavijesti.</p>
            <div className="flex justify-center mt-6">
              <PublicCta text="Primajte obavijesti" href="/signup" />
            </div>
          </div>
        ) : (
          <>
            {/* ── Rok uskoro (deadline ≤ 7 days) ─────────────────────── */}
            {(() => {
              const soon = filtered.filter((o) => {
                if (!o.deadline) return false;
                const d = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86_400_000);
                return d >= 0 && d <= 7;
              }).slice(0, 4);
              if (!soon.length) return null;
              return (
                <section className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      ⏰ Rok uskoro
                    </span>
                    <span className="text-xs text-slate-400">Prijava ističe u 7 dana</span>
                  </div>
                  <div className="space-y-3">
                    {soon.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
                  </div>
                </section>
              );
            })()}

            {/* ── Najvažnije (highest value with ai_summary) ──────────── */}
            {(() => {
              const soonIds = new Set(
                filtered.filter((o) => {
                  if (!o.deadline) return false;
                  const d = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86_400_000);
                  return d >= 0 && d <= 7;
                }).map((o) => o.id)
              );
              const top = filtered
                .filter((o) => !soonIds.has(o.id) && (o.value !== null || o.ai_summary !== null))
                .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                .slice(0, 3);
              if (!top.length) return null;
              return (
                <section className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      ⭐ Najvažnije
                    </span>
                    <span className="text-xs text-slate-400">Najveća vrijednost ili najrelevantniji pozivi</span>
                  </div>
                  <div className="space-y-3">
                    {top.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
                  </div>
                </section>
              );
            })()}

            {/* ── Lako za dobiti (ai_difficulty = lako) ───────────────── */}
            {(() => {
              const soonIds = new Set(
                filtered.filter((o) => {
                  if (!o.deadline) return false;
                  const d = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86_400_000);
                  return d >= 0 && d <= 7;
                }).map((o) => o.id)
              );
              const topIds = new Set(
                filtered
                  .filter((o) => !soonIds.has(o.id) && (o.value !== null || o.ai_summary !== null))
                  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                  .slice(0, 3)
                  .map((o) => o.id)
              );
              const easy = filtered
                .filter((o) => o.ai_difficulty === "lako" && !soonIds.has(o.id) && !topIds.has(o.id))
                .slice(0, 4);
              if (!easy.length) return null;
              return (
                <section className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      ✓ Lako za dobiti
                    </span>
                    <span className="text-xs text-slate-400">Niska konkurencija, jednostavna prijava</span>
                  </div>
                  <div className="space-y-3">
                    {easy.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
                  </div>
                </section>
              );
            })()}

            {/* ── Sve prilike (remainder) ──────────────────────────────── */}
            {(() => {
              const soonIds = new Set(
                filtered.filter((o) => {
                  if (!o.deadline) return false;
                  const d = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86_400_000);
                  return d >= 0 && d <= 7;
                }).map((o) => o.id)
              );
              const topIds = new Set(
                filtered
                  .filter((o) => !soonIds.has(o.id) && (o.value !== null || o.ai_summary !== null))
                  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                  .slice(0, 3)
                  .map((o) => o.id)
              );
              const easyIds = new Set(
                filtered
                  .filter((o) => o.ai_difficulty === "lako" && !soonIds.has(o.id) && !topIds.has(o.id))
                  .slice(0, 4)
                  .map((o) => o.id)
              );
              const rest = filtered.filter(
                (o) => !soonIds.has(o.id) && !topIds.has(o.id) && !easyIds.has(o.id)
              );
              if (!rest.length) return null;
              const shown = soonIds.size + topIds.size + easyIds.size;
              return (
                <section className="mb-10">
                  {shown > 0 && (
                    <h2 className="font-heading text-lg font-bold text-slate-900 mb-4">
                      Sve prilike ({rest.length})
                    </h2>
                  )}
                  <div className="space-y-3">
                    {rest.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
                  </div>
                </section>
              );
            })()}
          </>
        )}

        {/* ── CTA mid ─────────────────────────────────────────────────── */}
        <div className="mb-10 rounded-2xl border border-blue-100 bg-blue-50 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="font-semibold text-slate-900 text-sm">Pratite nove prilike u ovoj kategoriji</p>
            <p className="text-xs text-slate-500 mt-0.5">Registrujte se besplatno i budite prvi obaviješteni.</p>
          </div>
          <PublicCta text="Kreirajte besplatan račun" href={`/signup?ref=category&cat=${slug}`} className="shrink-0" />
        </div>

        {/* ── Related categories ───────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-xl font-bold text-slate-900 mb-4">
            Ostale kategorije
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/prilike/kategorija/${cat.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {cat.title}
                </p>
                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{cat.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
