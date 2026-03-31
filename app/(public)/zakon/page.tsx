import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PublicCta } from "@/components/public/public-cta";
import { Scale, FileText, Newspaper } from "lucide-react";

export const metadata: Metadata = {
  title: "Zakon o javnim nabavkama BiH — Izmjene i vijesti | MojaPonuda.ba",
  description: "Pratite zakon o javnim nabavkama u BiH, izmjene propisa i relevantne vijesti. Ažurirano iz službenih izvora.",
  alternates: { canonical: "https://mojaponuda.ba/zakon" },
};

export const revalidate = 3600;

const TYPE_CONFIG = {
  zakon: { label: "Zakon", icon: Scale, color: "text-blue-700 bg-blue-50 border-blue-200" },
  izmjena: { label: "Izmjena", icon: FileText, color: "text-amber-700 bg-amber-50 border-amber-200" },
  vijest: { label: "Vijest", icon: Newspaper, color: "text-slate-700 bg-slate-100 border-slate-200" },
};

export default async function ZakonPage() {
  const supabase = await createClient();

  const { data: updates } = await supabase
    .from("legal_updates")
    .select("id, type, title, summary, source, source_url, published_date, relevance_tags")
    .order("published_date", { ascending: false, nullsFirst: false })
    .limit(30);

  const zakoni = (updates ?? []).filter((u) => u.type === "zakon");
  const izmjene = (updates ?? []).filter((u) => u.type === "izmjena");
  const vijesti = (updates ?? []).filter((u) => u.type === "vijest");

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Zakon o javnim nabavkama
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Pratite izmjene zakona, podzakonske akte i relevantne vijesti iz oblasti javnih nabavki u BiH.
          </p>
          <PublicCta
            text="Pratite izmjene u dashboardu"
            href="/signup"
            className="mt-6"
          />
        </div>

        {vijesti.length > 0 && (
          <Section title="Vijesti" items={vijesti} formatDate={formatDate} />
        )}
        {izmjene.length > 0 && (
          <Section title="Izmjene i dopune" items={izmjene} formatDate={formatDate} />
        )}
        {zakoni.length > 0 && (
          <Section title="Zakoni i pravilnici" items={zakoni} formatDate={formatDate} />
        )}

        {(updates ?? []).length === 0 && (
          <div className="text-center py-20 text-slate-500">
            Pravne izmjene se prate svakodnevno. Provjerite ponovo uskoro.
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ title, items, formatDate }: {
  title: string;
  items: Array<{ id: string; type: string; title: string; summary: string | null; source: string; source_url: string | null; published_date: string | null; relevance_tags: string[] | null }>;
  formatDate: (d: string | null) => string | null;
}) {
  return (
    <section className="mb-12">
      <h2 className="font-heading text-2xl font-bold text-slate-900 mb-6">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => {
          const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.vijest;
          const Icon = config.icon;
          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${config.color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                    {item.published_date && (
                      <span className="text-xs text-slate-400">{formatDate(item.published_date)}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  {item.summary && (
                    <p className="text-sm leading-6 text-slate-600">{item.summary}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-400">Izvor: {item.source}</span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Pročitaj original →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
