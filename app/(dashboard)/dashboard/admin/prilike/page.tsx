import { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BarChart3, Eye, ExternalLink, MousePointerClick, TrendingUp } from "lucide-react";
import { ScraperSourcesList } from "@/components/admin/scraper-sources-list";

export const metadata: Metadata = {
  title: "Prilike & Scraperi | Admin",
};

interface ScraperLog {
  id: string;
  source: string;
  items_found: number;
  items_new: number;
  items_skipped: number;
  error: string | null;
  ran_at: string;
}

export default async function AdminPrilikePage() {
  await requireAdminUser();
  const supabase = createAdminClient();

  const [
    { data: opportunities },
    { data: scraperLogs },
    { count: totalOpportunities },
    { count: publishedOpportunities },
    { data: legalUpdates },
    { data: recentLogs },
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, title, type, quality_score, published, status, source_url, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("scraper_log")
      .select("source, items_found, items_new, items_skipped, error, ran_at")
      .order("ran_at", { ascending: false })
      .limit(20),
    supabase.from("opportunities").select("*", { count: "exact", head: true }),
    supabase.from("opportunities").select("*", { count: "exact", head: true }).eq("published", true),
    supabase
      .from("legal_updates")
      .select("id, type, title, source_url, published_date")
      .order("published_date", { ascending: false, nullsFirst: false })
      .limit(10),
    supabase
      .from("scraper_log")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          Prilike & Scraperi
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Pokrenite scrapere, pregledajte rezultate i upravljajte prilikama.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Ukupno prilike", value: totalOpportunities ?? 0, icon: TrendingUp },
          { label: "Objavljeno", value: publishedOpportunities ?? 0, icon: Eye },
          { label: "Pravne izmjene", value: (legalUpdates ?? []).length, icon: BarChart3 },
          { label: "Scraper logovi", value: (scraperLogs ?? []).length, icon: MousePointerClick },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="size-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</p>
            </div>
            <p className="font-heading text-3xl font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Scraper controls — Run All + individual buttons */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">Scraperi</h2>
        </div>
        <div className="p-6">
          <ScraperSourcesList initialLogs={(recentLogs as ScraperLog[]) ?? []} />
        </div>
      </div>

      {/* Scraper logs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">Posljednji logovi</h2>
        </div>
        {(scraperLogs ?? []).length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Nema logova. Pokrenite scraper da vidite rezultate.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(scraperLogs ?? []).map((log, i) => (
              <div key={`${log.source}-${log.ran_at}-${i}`} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{log.source}</p>
                  {log.error && <p className="text-xs text-red-600 mt-0.5 max-w-[500px] truncate">{log.error}</p>}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{log.items_found} pronađeno</span>
                  <span className="text-emerald-700 font-semibold">{log.items_new} novo</span>
                  <span>{log.items_skipped} preskočeno</span>
                  <span>{log.ran_at ? new Date(log.ran_at).toLocaleString("bs-BA") : "Nije poznato"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legal updates */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">Pravne izmjene (zadnjih 10)</h2>
        </div>
        {(legalUpdates ?? []).length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Nema pravnih izmjena u bazi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(legalUpdates ?? []).map((u) => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{u.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{u.type}</span>
                  {u.published_date && <span className="text-xs text-slate-400">{u.published_date}</span>}
                  {u.source_url && (
                    <a href={u.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Opportunities list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Prilike {(opportunities ?? []).length === 0 ? "(prazno)" : `(zadnjih 20)`}
          </h2>
        </div>
        {(opportunities ?? []).length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Nema prilika u bazi. Pokrenite scrapere iznad.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(opportunities ?? []).map((o) => (
              <div key={o.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{o.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{o.type} · score: {o.quality_score}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${o.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {o.published ? "Objavljeno" : "Draft"}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${o.status === "active" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                    {o.status}
                  </span>
                  {o.source_url && (
                    <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
