import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  FileText,
  Briefcase,
  Search,
  Award,
  AlertTriangle,
  ArrowRight,
  Clock,
  Plus,
  TrendingUp,
  Building2,
  Upload,
  Eye,
  PenLine,
  Trash2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BidStatus, Document as DocType } from "@/types/database";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

const STATUS_CONFIG: Record<string, { label: string; colors: string }> = {
  draft: { label: "Nacrt", colors: "bg-slate-100 text-slate-700 border-slate-200" },
  in_review: { label: "U pregledu", colors: "bg-amber-50 text-amber-700 border-amber-200" },
  submitted: { label: "Predato", colors: "bg-blue-50 text-blue-700 border-blue-200" },
  won: { label: "Pobijeđeno", colors: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost: { label: "Izgubljeno", colors: "bg-red-50 text-red-700 border-red-200" },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!company) redirect("/onboarding");

  const [
    { count: documentsCount },
    { count: bidsCount },
    { count: wonBidsCount },
    { count: lostBidsCount },
    { data: expiringDocs },
    { data: recentBids },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id).in("status", ["draft", "in_review", "submitted"]),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "won"),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "lost"),
    supabase
      .from("documents")
      .select("id, name, type, expires_at")
      .eq("company_id", company.id)
      .not("expires_at", "is", null)
      .lte("expires_at", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("bids")
      .select("id, status, created_at, tenders(title, deadline, estimated_value)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const expiring = (expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[];
  const bids = (recentBids ?? []) as {
    id: string;
    status: BidStatus;
    created_at: string;
    tenders: { title: string; deadline: string | null; estimated_value: number | null };
  }[];

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Dobro jutro" : now.getHours() < 18 ? "Dobar dan" : "Dobra večer";
  
  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            {greeting}, {company.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Evo pregleda vaših aktivnosti i ponuda danas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tenders"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-700 border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:text-primary hover:border-blue-200"
          >
            <Search className="size-4" />
            Pronađi tender
          </Link>
          <Link
            href="/dashboard/bids"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Plus className="size-4" />
            Nova ponuda
          </Link>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Large Metric Card */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-1 rounded-[1.5rem] bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-100" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-500">Ukupno ponuda</p>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900 relative z-10 mt-2">
            {(bidsCount ?? 0) + (wonBidsCount ?? 0) + (lostBidsCount ?? 0)}
          </p>
        </div>

        {/* Small Metric Cards */}
        <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md hover:border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-600">U pripremi</p>
          </div>
          <p className="font-heading text-3xl font-bold text-slate-900 ml-1">
            {bidsCount ?? 0}
          </p>
        </div>

        <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md hover:border-emerald-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-600">Pobijeđeno</p>
          </div>
          <p className="font-heading text-3xl font-bold text-slate-900 ml-1">
            {wonBidsCount ?? 0}
          </p>
        </div>

        <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md hover:border-red-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TrendingUp className="size-5 rotate-180" />
            </div>
            <p className="text-sm font-bold text-slate-600">Izgubljeno</p>
          </div>
          <p className="font-heading text-3xl font-bold text-slate-900 ml-1">
            {lostBidsCount ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content Area - Active Tenders */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[1.5rem] bg-white shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-50">
              <h2 className="font-heading text-xl font-bold text-slate-900">Aktivne ponude</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pretraži ponude..." 
                    className="h-9 pl-9 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-48 sm:w-64"
                  />
                </div>
                <Link href="/dashboard/bids" className="hidden sm:flex h-9 items-center justify-center px-4 rounded-xl bg-blue-50 text-sm font-bold text-primary hover:bg-blue-100 transition-colors">
                  Sve ponude
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4 pl-6 font-medium w-[40%]">Naziv tendera</th>
                    <th className="p-4 font-medium">Rok za predaju</th>
                    <th className="p-4 font-medium">Budžet</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 pr-6 text-right font-medium">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bids.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex size-16 items-center justify-center rounded-full bg-slate-50 mb-4 text-slate-300">
                            <Briefcase className="size-8" />
                          </div>
                          <p className="text-base font-bold text-slate-900 mb-1">Nema aktivnih ponuda</p>
                          <p className="text-sm text-slate-500 mb-6 max-w-sm">
                            Niste započeli pripremu nijedne ponude.
                          </p>
                          <Link
                            href="/dashboard/tenders"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
                          >
                            Pretraži tendere
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bids.map((bid) => {
                      const status = STATUS_CONFIG[bid.status] || STATUS_CONFIG.draft;
                      return (
                        <tr key={bid.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="p-4 pl-6">
                            <Link href={`/dashboard/bids/${bid.id}`} className="font-semibold text-slate-900 hover:text-primary transition-colors line-clamp-1 pr-4" title={bid.tenders?.title}>
                              {bid.tenders?.title ?? "Nepoznat tender"}
                            </Link>
                          </td>
                          <td className="p-4 text-sm text-slate-600 font-medium">
                            {formatDate(bid.tenders?.deadline)}
                          </td>
                          <td className="p-4 text-sm font-bold text-slate-700">
                            {bid.tenders?.estimated_value ? `${bid.tenders.estimated_value.toLocaleString("bs-BA")} KM` : "—"}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${status.colors}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-4 pr-6">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/dashboard/bids/${bid.id}`} className="p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors" title="Pregledaj">
                                <Eye className="size-4" />
                              </Link>
                              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Uredi">
                                <PenLine className="size-4" />
                              </button>
                              <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Obriši">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Expiring Documents Widget */}
          {expiring.length > 0 && (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <AlertTriangle className="size-5" />
                </div>
                <h3 className="font-heading text-lg font-bold text-amber-900">
                  Dokumenti ističu
                </h3>
              </div>
              
              <div className="space-y-3 relative z-10 mb-5">
                {expiring.slice(0, 3).map((doc) => {
                  const days = daysUntil(doc.expires_at!);
                  const urgent = days <= 7;
                  return (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl bg-white p-3 border border-amber-100/50 shadow-sm">
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-bold text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.type}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${urgent ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                        {days === 0 ? "Danas" : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Link 
                href="/dashboard/vault" 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 border border-amber-200 shadow-sm transition-all hover:bg-amber-100/50 relative z-10"
              >
                Ažuriraj trezor
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="rounded-[1.5rem] bg-white border border-slate-100 p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-5">Brze akcije</h2>
            
            <div className="space-y-3">
              <Link href="/dashboard/vault" className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 group-hover:bg-blue-50 group-hover:text-primary transition-colors shadow-sm border border-slate-100">
                  <Upload className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Spremi dokument</p>
                  <p className="text-xs text-slate-500 mt-0.5">Dodajte u sigurni trezor</p>
                </div>
              </Link>

              <Link href="/dashboard/intelligence" className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-purple-200 hover:bg-white hover:shadow-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors shadow-sm border border-slate-100">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Analiza tržišta</p>
                  <p className="text-xs text-slate-500 mt-0.5">Istražite konkurenciju</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
