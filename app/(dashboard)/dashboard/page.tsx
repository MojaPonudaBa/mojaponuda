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

  
  return (
    <div className="space-y-6">
      {/* Top bar with action */}
      <div className="flex items-center justify-end">
        <Link
          href="/dashboard/bids"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Nova ponuda
        </Link>
      </div>

      {/* Stats row: hero stat + 3 compact metrics */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* Hero stat card */}
        <div className="flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm lg:min-w-[200px]">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FileText className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ukupno ponuda</p>
            <p className="mt-1 font-heading text-4xl font-bold text-slate-900">
              {displayTotalBids}
            </p>
          </div>
        </div>

        {/* 3 compact metric cards */}
        <div className="grid flex-1 grid-cols-3 gap-4">
          <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">U pripremi</p>
              <p className="mt-0.5 font-heading text-2xl font-bold text-slate-900">
                {displayDraftBids}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Award className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pobijeđeno</p>
              <p className="mt-0.5 font-heading text-2xl font-bold text-slate-900">
                {displayWonBids}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <TrendingUp className="size-5 rotate-180" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Izgubljeno</p>
              <p className="mt-0.5 font-heading text-2xl font-bold text-slate-900">
                {displayLostBids}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tenders Table */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="font-heading text-xl font-bold text-slate-900">Aktivne ponude</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pretraži..." 
              className="h-9 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-medium">Naziv tendera</th>
                <th className="px-6 py-4 font-medium">Rok</th>
                <th className="px-6 py-4 font-medium">Budžet</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bids.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Briefcase className="mb-3 size-10 text-slate-300" />
                      <p className="mb-1 font-semibold text-slate-900">Nema aktivnih ponuda</p>
                      <p className="mb-4 text-sm text-slate-500">Započnite pripremu ponude za tender.</p>
                      <Link
                        href="/dashboard/tenders"
                        className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
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
                    <tr key={bid.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/bids/${bid.id}`} className="font-medium text-slate-900 hover:text-blue-600" title={bid.tenders?.title}>
                          {bid.tenders?.title ?? "Nepoznat tender"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(bid.tenders?.deadline)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {bid.tenders?.estimated_value ? `${bid.tenders.estimated_value.toLocaleString("bs-BA")} KM` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${status.colors}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
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

      {/* Recommended Tenders */}
      <Suspense fallback={<div className="h-48 rounded-2xl bg-white shadow-sm animate-pulse" />}>
        <RecommendedTenders />
      </Suspense>
    </div>
  );
}
