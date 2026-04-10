import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OpportunityCard } from "@/components/public/opportunity-card";
import { PublicCta } from "@/components/public/public-cta";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-categories";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Poticaji i grantovi za firme u BiH | TenderSistem.com",
  description: "Aktivni grantovi i poticaji za firme u Bosni i Hercegovini. Federalni, kantonalni i EU programi. Svakodnevno aÅ¾urirano.",
  alternates: { canonical: "https://tendersistem.com/prilike" },
};

export const revalidate = 3600; // 1h ISR

export default async function PrilikePage() {
  const supabase = await createClient();

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, slug, type, title, issuer, category, value, deadline, location, ai_summary, ai_difficulty")
    .eq("published", true)
    .eq("status", "active")
    .eq("type", "poticaj")
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(40);

  const all = opportunities ?? [];

  const soonIds = new Set(
    all.filter((o) => {
      if (!o.deadline) return false;
      const d = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86_400_000);
      return d >= 0 && d <= 7;
    }).map((o) => o.id)
  );
  const soon = all.filter((o) => soonIds.has(o.id));
  const topIds = new Set(
    all
      .filter((o) => !soonIds.has(o.id) && o.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 4)
      .map((o) => o.id)
  );
  const top = all.filter((o) => topIds.has(o.id));
  const poticaji = all.filter((o) => !soonIds.has(o.id) && !topIds.has(o.id));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Poticaji i grantovi za firme u BiH
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Aktivni grantovi i poticaji za firme u Bosni i Hercegovini.
            Svakodnevno aÅ¾urirano.
          </p>
          <PublicCta
            text="Pratite prilike prilagoÄ‘ene vaÅ¡oj firmi"
            href="/signup"
            className="mt-6"
          />
        </div>

        {/* Category navigation */}
        <section className="mb-12">
          <h2 className="font-heading text-xl font-bold text-slate-900 mb-4">
            PretraÅ¾i po kategoriji
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OPPORTUNITY_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/prilike/kategorija/${cat.slug}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                  {cat.title}
                </span>
                <ArrowRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {all.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            Prilike se aÅ¾uriraju svakodnevno. Provjerite ponovo uskoro.
          </div>
        )}

        {/* Rok uskoro */}
        {soon.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                â° Rok uskoro
              </span>
              <span className="text-xs text-slate-400">Prijava istiÄe u 7 dana</span>
            </div>
            <div className="space-y-4">
              {soon.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
            </div>
          </section>
        )}

        {/* NajvaÅ¾nije */}
        {top.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                â­ NajvaÅ¾nije
              </span>
              <span className="text-xs text-slate-400">NajveÄ‡a vrijednost</span>
            </div>
            <div className="space-y-4">
              {top.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
            </div>
          </section>
        )}

        {poticaji.length > 0 && (
          <section className="mb-10">
            <h2 className="font-heading text-2xl font-bold text-slate-900 mb-6">
              Poticaji i grantovi
            </h2>
            <div className="space-y-4">
              {poticaji.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

