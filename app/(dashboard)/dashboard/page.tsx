import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  demoBidSummaries,
  getDemoDocuments,
  isCompanyProfileComplete,
  isDemoUser,
} from "@/lib/demo";
import {
  FileText,
  Briefcase,
  Search,
  Award,
  AlertTriangle,
  Clock,
  Plus,
  TrendingUp,
  Upload
} from "lucide-react";
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

import { RecommendedTenders } from "@/components/dashboard/recommended-tenders";
import { Suspense } from "react";
import { BidQuickActions } from "@/components/bids/bid-quick-actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDemoAccount = isDemoUser(user.email);
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, jib")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as { id: string; name: string; jib: string };

  // Calculate dates outside of query builder to avoid impure function warnings
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [
    , // documentsCount (unused)
    { count: bidsCount },
    { count: wonBidsCount },
    { count: lostBidsCount },
    { data: expiringDocs },
    { data: recentBids },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).in("status", ["draft", "in_review", "submitted"]),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).eq("status", "won"),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).eq("status", "lost"),
    supabase
      .from("documents")
      .select("id, name, type, expires_at")
      .eq("company_id", resolvedCompany.id)
      .not("expires_at", "is", null)
      .lte("expires_at", sixtyDaysFromNow)
      .gte("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("bids")
      .select("id, status, created_at, tenders(title, deadline, estimated_value)")
      .eq("company_id", resolvedCompany.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const demoDocuments = isDemoAccount ? getDemoDocuments(resolvedCompany.id) : [];
  const expiring = ((expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[]).length > 0
    ? ((expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[])
    : demoDocuments;
  const realBids = (recentBids ?? []) as {
    id: string;
    status: BidStatus;
    created_at: string;
    tenders: { title: string; deadline: string | null; estimated_value: number | null };
  }[];
  const bids = realBids.length > 0
    ? realBids
    : isDemoAccount
      ? demoBidSummaries.map((bid) => ({
        id: bid.id,
        status: bid.status,
        created_at: bid.created_at,
        tenders: {
          title: bid.tender.title,
          deadline: bid.tender.deadline,
          estimated_value: bid.tender.estimated_value,
        },
      }))
      : [];

  const totalActiveBids = (bidsCount ?? 0) + (wonBidsCount ?? 0) + (lostBidsCount ?? 0);
  const displayTotalBids = totalActiveBids > 0 ? totalActiveBids : bids.length;
  const displayDraftBids = (bidsCount ?? 0) > 0 ? (bidsCount ?? 0) : bids.filter((bid) => ["draft", "in_review", "submitted"].includes(bid.status)).length;
  const displayWonBids = (wonBidsCount ?? 0) > 0 ? (wonBidsCount ?? 0) : bids.filter((bid) => bid.status === "won").length;
  const displayLostBids = (lostBidsCount ?? 0) > 0 ? (lostBidsCount ?? 0) : bids.filter((bid) => bid.status === "lost").length;

  const greeting = now.getHours() < 12 ? "Dobro jutro" : now.getHours() < 18 ? "Dobar dan" : "Dobra večer";
  
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold text-slate-950 tracking-tight lg:text-5xl">
            {greeting}, {resolvedCompany.name.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 lg:text-lg">
            Evo pregleda vaših aktivnosti i ponuda danas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/tenders"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50 hover:text-primary"
          >
            <Search className="size-4" />
            Pronađi tender
          </Link>
          <Link
            href="/dashboard/bids"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.8)] transition-all hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Plus className="size-4" />
          </Link>
        </div>
      </div>

      {/* Recommended Tenders Widget */}
      <Suspense fallback={<div className="h-48 rounded-2xl bg-slate-50 animate-pulse" />}>
        <RecommendedTenders />
      </Suspense>

      {/* Top Metrics Row */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Large Metric Card */}
        <div className="group relative col-span-1 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.22)] sm:col-span-2 xl:col-span-1">
          <div className="absolute right-0 top-0 h-36 w-36 -translate-y-8 translate-x-8 rounded-full bg-blue-100/80 blur-3xl transition-all group-hover:bg-blue-200/70" />
          <div className="relative z-10 flex items-center gap-3 mb-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <FileText className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-500">Ukupno ponuda</p>
          </div>
          <p className="relative z-10 mt-4 font-heading text-5xl font-extrabold text-slate-950">
            {displayTotalBids}
          </p>
        </div>

        {/* Small Metric Cards */}
        <div className="flex flex-col justify-center rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-[0_28px_50px_-32px_rgba(37,99,235,0.28)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Clock className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-600">U pripremi</p>
          </div>
          <p className="ml-1 font-heading text-4xl font-bold text-slate-950">
            {displayDraftBids}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5 hover:border-emerald-100 hover:shadow-[0_28px_50px_-32px_rgba(16,185,129,0.24)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <Award className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-600">Pobijeđeno</p>
          </div>
          <p className="ml-1 font-heading text-4xl font-bold text-slate-950">
            {displayWonBids}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5 hover:border-red-100 hover:shadow-[0_28px_50px_-32px_rgba(239,68,68,0.22)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
              <TrendingUp className="size-5 rotate-180" />
            </div>
            <p className="text-sm font-bold text-slate-600">Izgubljeno</p>
          </div>
          <p className="ml-1 font-heading text-4xl font-bold text-slate-950">
            {displayLostBids}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        {/* Main Content Area - Active Tenders */}
        <div className="space-y-6">
          <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-7 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="font-heading text-xl font-bold text-slate-900">Aktivne ponude</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pretraži ponude..." 
                    className="h-11 w-56 rounded-2xl border border-slate-200 pl-10 pr-4 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-72"
                  />
                </div>
                <Link href="/dashboard/bids" className="hidden h-11 items-center justify-center rounded-2xl bg-blue-50 px-4 text-sm font-bold text-primary transition-colors hover:bg-blue-100 sm:flex">
                  Sve ponude
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="min-w-[680px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="w-[40%] p-5 pl-7 font-medium">Naziv tendera</th>
                    <th className="p-5 font-medium">Rok za predaju</th>
                    <th className="p-5 font-medium">Budžet</th>
                    <th className="p-5 font-medium">Status</th>
                    <th className="p-5 pr-7 text-right font-medium">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bids.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
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
                          <td className="p-5 pl-7">
                            <Link href={`/dashboard/bids/${bid.id}`} className="font-semibold text-slate-900 hover:text-primary transition-colors line-clamp-1 pr-4" title={bid.tenders?.title}>
                              {bid.tenders?.title ?? "Nepoznat tender"}
                            </Link>
                          </td>
                          <td className="p-5 text-sm text-slate-600 font-medium">
                            {formatDate(bid.tenders?.deadline)}
                          </td>
                          <td className="p-5 text-sm font-bold text-slate-700">
                            {bid.tenders?.estimated_value ? `${bid.tenders.estimated_value.toLocaleString("bs-BA")} KM` : "—"}
                          </td>
                          <td className="p-5">
                            <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${status.colors}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-5 pr-7">
                            <BidQuickActions bidId={bid.id} currentStatus={bid.status} />
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
            <div className="relative overflow-hidden rounded-[1.75rem] border border-amber-200 bg-[linear-gradient(180deg,#fff8e6_0%,#fffef8_100%)] p-7 shadow-[0_22px_44px_-30px_rgba(245,158,11,0.35)]">
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200/70">
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
                    <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-amber-100/60 bg-white p-4 shadow-sm">
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
                className="relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100/50"
              >
                Ažuriraj trezor
              </Link>
            </div>
          )}

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.18)]">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-5">Brze akcije</h2>
            
            <div className="space-y-3">
              <Link href="/dashboard/vault" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 group-hover:bg-blue-50 group-hover:text-primary transition-colors shadow-sm border border-slate-100">
                  <Upload className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Spremi dokument</p>
                  <p className="text-xs text-slate-500 mt-0.5">Dodajte u sigurni trezor</p>
                </div>
              </Link>

              <Link href="/dashboard/intelligence" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:border-purple-200 hover:bg-white hover:shadow-sm">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors shadow-sm border border-slate-100">
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
