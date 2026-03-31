import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BarChart3, Eye, MousePointerClick, TrendingUp } from "lucide-react";

export default async function AdminPrilikePage() {
  await requireAdminUser();
  const supabase = createAdminClient();

  const [
    { data: opportunities },
    { data: analytics },
    { data: scraperLogs },
    { count: totalOpportunities },
    { count: publishedOpportunities },
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, title, type, quality_score, published, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("page_analytics")
      .select("event, path, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("scraper_log")
      .select("source, items_found, items_new, items_skipped, error, ran_at")
      .order("ran_at", { ascending: false })
      .limit(10),
    supabase.from("opportunities").select("*", { count: "exact", head: true }),
    supabase.from("opportunities").select("*", { count: "exact", head: true }).eq("published", true),
  ]);

  const views = (analytics ?? []).filter((a) => a.event === "view").length;
  const ctaClicks = (analytics ?? []).filter((a) => a.event === "cta_click").length;
  const signups = (analytics ?? []).filter((a) => a.event === "signup").length;

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          Prilike — Admin
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Upravljanje prilikama, analitika i scraper logovi.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Ukupno prilike", value: totalOpportunities ?? 0, icon: TrendingUp },
          { label: "Objavljeno", value: publishedOpportunities ?? 0, icon: Eye },
          { label: "Pregledi (100)", value: views, icon: BarChart3 },
          { label: "CTA klikovi", value: ctaClicks, icon: MousePointerClick },
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

      {/* Scraper logs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">Scraper logovi</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {(scraperLogs ?? []).map((log) => (
            <div key={log.ran_at} className="px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{log.source}</p>
                {log.error && <p className="text-xs text-red-600 mt-0.5">{log.error}</p>}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{log.items_found} pronađeno</span>
                <span className="text-emerald-700 font-semibold">{log.items_new} novo</span>
                <span>{new Date(log.ran_at).toLocaleString("bs-BA")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">Prilike (zadnjih 20)</h2>
        </div>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
