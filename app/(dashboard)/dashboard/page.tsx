import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
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
  Clock,
  TrendingUp,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  BellRing,
  ShieldCheck,
} from "lucide-react";
import { RecommendedTenders } from "@/components/dashboard/recommended-tenders";
import type { BidStatus, Document as DocType } from "@/types/database";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  return new Intl.NumberFormat("bs-BA", {
    style: "currency",
    currency: "BAM",
    maximumFractionDigits: 0,
  }).format(value);
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
    <div className="space-y-8 lg:space-y-10">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:p-8 lg:p-9">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between xl:gap-10">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1">
              <ShieldCheck className="size-4 text-blue-600" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                Operativni pregled
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.7rem]">
                Pregled tender aktivnosti za {resolvedCompany.name}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
                Kontrolna tabla osmišljena da odmah pokaže šta je prioritet, koje su ponude u toku i gdje trebate reagovati bez gubljenja vremena.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-5 lg:p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <FileText className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">Ukupno ponuda</p>
                <p className="mt-2 font-heading text-3xl font-bold text-slate-950 lg:text-[2rem]">{displayTotalBids}</p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 lg:p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Clock className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">U pripremi</p>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-950">{displayDraftBids}</p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 lg:p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Award className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">Pobijeđeno</p>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-950">{displayWonBids}</p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 lg:p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <TrendingUp className="size-5 rotate-180" />
                </div>
                <p className="text-sm font-medium text-slate-500">Izgubljeno</p>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-950">{displayLostBids}</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm lg:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Brze akcije</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Naredni korak</h2>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <ArrowUpRight className="size-5" />
              </div>
            </div>
            <div className="space-y-3">
              <Link
                href="/dashboard/bids"
                className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700"
              >
                Nova ponuda
                <ChevronDown className="size-4 -rotate-90" />
              </Link>
              <Link
                href="/dashboard/tenders"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Tender Skener
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/vault"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Dokument Vault
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-700">
                <BellRing className="size-4 text-blue-600" />
                <p className="text-sm font-semibold">Dokumenti pred istekom</p>
              </div>
              <p className="font-heading text-3xl font-bold text-slate-950">{expiring.length}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {expiring.length > 0
                  ? "Provjerite dokumente kojima ističe važenje kako biste izbjegli diskvalifikaciju u zadnjem trenutku."
                  : "Trenutno nema dokumenata kojima uskoro ističe važenje."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px] xl:gap-7">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-950">Aktivne ponude</h2>
              <p className="mt-1 text-sm text-slate-500">Najnovije aktivnosti i statusi ponuda koje su trenutno u radu.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pretraži ponude..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-72"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-7 py-4">Naziv tendera</th>
                  <th className="px-7 py-4">Rok</th>
                  <th className="px-7 py-4">Vrijednost</th>
                  <th className="px-7 py-4">Status</th>
                  <th className="px-7 py-4 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {bids.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-7 py-16 text-center">
                      <Briefcase className="mx-auto mb-3 size-10 text-slate-300" />
                      <p className="mb-1 font-semibold text-slate-900">Nema aktivnih ponuda</p>
                      <p className="mb-4 text-sm text-slate-500">Započnite pripremu ponude za novi tender.</p>
                      <Link
                        href="/dashboard/tenders"
                        className="inline-flex h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-700"
                      >
                        Otvori Tender Skener
                      </Link>
                    </td>
                  </tr>
                ) : (
                  bids.map((bid) => {
                    const status = STATUS_CONFIG[bid.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={bid.id} className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50/60">
                        <td className="px-7 py-4.5">
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                              <FileText className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <Link href={`/dashboard/bids/${bid.id}`} className="line-clamp-2 font-semibold leading-6 text-slate-950 transition-colors hover:text-blue-700">
                                {bid.tenders?.title ?? "Nepoznat tender"}
                              </Link>
                              <p className="mt-1 text-sm text-slate-500">Otvoreno {formatDate(bid.created_at)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-7 py-4.5 text-sm font-medium text-slate-700">
                          {formatDate(bid.tenders?.deadline)}
                        </td>
                        <td className="px-7 py-4.5 text-sm font-semibold text-slate-950">
                          {formatCurrency(bid.tenders?.estimated_value)}
                        </td>
                        <td className="px-7 py-4.5">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.colors}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-7 py-4.5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/bids/${bid.id}`}
                              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all duration-150 hover:border-slate-300 hover:text-slate-700"
                            >
                              <Eye className="size-4" />
                            </Link>
                            <Link
                              href={`/dashboard/bids/${bid.id}`}
                              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all duration-150 hover:border-slate-300 hover:text-slate-700"
                            >
                              <Pencil className="size-4" />
                            </Link>
                            <button
                              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            >
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

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Operativni fokus</p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-slate-950">Sljedećih 60 dana</h3>
            <div className="mt-5 space-y-3">
              {expiring.length > 0 ? (
                expiring.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{doc.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{doc.type}</p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        {doc.expires_at ? `${daysUntil(doc.expires_at)} dana` : "—"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Ističe {formatDate(doc.expires_at ?? null)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                  Vaš dokumentacioni trezor je uredan. Trenutno nema stavki koje zahtijevaju hitnu obnovu.
                </div>
              )}
            </div>
            <Link href="/dashboard/vault" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800">
              Otvori Document Vault
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-48 animate-pulse rounded-[1.75rem] border border-slate-200 bg-white" />}>
        <RecommendedTenders />
      </Suspense>
    </div>
  );
}
