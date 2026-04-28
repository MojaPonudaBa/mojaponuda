"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BidStatus } from "@/types/database";
import { BID_STATUSES, BID_STATUS_LABELS } from "@/lib/bids/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Edit,
  Filter,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";

export interface BidRow {
  id: string;
  status: BidStatus;
  created_at: string;
  tender: {
    id: string;
    title: string;
    contracting_authority: string | null;
    deadline: string | null;
  } | null;
  clientName?: string;
  clientId?: string;
}

interface BidsTableProps {
  bids: BidRow[];
  showClientColumn?: boolean;
  basePath?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Rok nije objavljen";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  in_review: "border-amber-200 bg-amber-50 text-amber-700",
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  won: "border-emerald-200 bg-emerald-50 text-emerald-700",
  lost: "border-rose-200 bg-rose-50 text-rose-700",
};

export function BidsTable({
  bids,
  showClientColumn = false,
  basePath,
}: BidsTableProps) {
  const [rows, setRows] = useState(bids);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setRows(bids);
  }, [bids]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((bid) => bid.status === statusFilter);
  }, [rows, statusFilter]);

  async function updateBidStatus(bidId: string, newStatus: BidStatus) {
    setUpdatingId(bidId);
    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Status nije ažuriran.");
      }

      setRows((current) =>
        current.map((bid) => (bid.id === bidId ? { ...bid, status: newStatus } : bid)),
      );
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteBid(bidId: string) {
    const confirmed = window.confirm("Želite li ukloniti ovu ponudu sa liste?");
    if (!confirmed) return;

    setDeletingId(bidId);
    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Ponuda nije uklonjena.");
      }

      setRows((current) => current.filter((bid) => bid.id !== bidId));
    } catch (error) {
      console.error("Failed to delete bid:", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Filter className="size-4" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-950">Pregled ponuda</h3>
              <p className="text-sm text-slate-500">Status, rokovi i akcije složeni za brzi operativni rad.</p>
            </div>
          </div>
          <div className="w-full max-w-[240px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-900 shadow-sm">
                <SelectValue placeholder="Svi statusi" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 bg-white text-slate-900 shadow-xl">
                <SelectItem value="all" className="rounded-xl focus:bg-blue-50 focus:text-blue-700">Svi statusi</SelectItem>
                {BID_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="rounded-xl focus:bg-blue-50 focus:text-blue-700">
                    {BID_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50">
            <Briefcase className="size-8 text-blue-600" />
          </div>
          <h3 className="mb-2 font-heading text-lg font-bold text-slate-950">
            {rows.length === 0 ? "Nemate aktivnih ponuda" : "Nema rezultata"}
          </h3>
          <p className="max-w-sm text-sm text-slate-500">
            {rows.length === 0
              ? 'Započnite klikom na dugme "Nova ponuda" iznad.'
              : "Pokušajte promijeniti filtere za pretragu."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bid) => {
            // Construct href based on basePath or use default
            let bidHref = `/dashboard/bids/${bid.id}`;
            if (basePath) {
              bidHref = `${basePath}/${bid.id}`;
            } else if (bid.clientId) {
              // For agency view with client context
              bidHref = `/dashboard/agency/clients/${bid.clientId}/bids/${bid.id}`;
            }

            return (
              <article
                key={bid.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 sm:p-5"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[bid.status] || STATUS_STYLES.draft}`}>
                        {BID_STATUS_LABELS[bid.status]}
                      </span>
                      {showClientColumn && bid.clientName ? (
                        <span className="inline-flex max-w-full items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          <span className="truncate">{bid.clientName}</span>
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-4 line-clamp-2 text-lg font-semibold leading-7 text-slate-950">
                      {bid.tender?.title ?? "Tender nije dostupan"}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                      <span className="inline-flex max-w-full items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-slate-400" />
                        <span className="truncate" title={bid.tender?.contracting_authority ?? ""}>
                          {bid.tender?.contracting_authority ?? "Nepoznat naručilac"}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="size-4 shrink-0 text-slate-400" />
                        {formatDate(bid.tender?.deadline ?? null)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    {bid.status !== "won" && bid.status !== "lost" ? (
                      <>
                        <Button
                          variant="outline"
                          disabled={updatingId === bid.id}
                          onClick={() => updateBidStatus(bid.id, "won")}
                          className="h-11 rounded-xl border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        >
                          {updatingId === bid.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                          Dobijeno
                        </Button>
                        <Button
                          variant="outline"
                          disabled={updatingId === bid.id}
                          onClick={() => updateBidStatus(bid.id, "lost")}
                          className="h-11 rounded-xl border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                        >
                          {updatingId === bid.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <XCircle className="mr-2 size-4" />}
                          Izgubljeno
                        </Button>
                        <Button
                          variant="outline"
                          disabled={deletingId === bid.id}
                          onClick={() => deleteBid(bid.id)}
                          className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {deletingId === bid.id ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 size-4" />
                          )}
                          Odustani od ponude
                        </Button>
                      </>
                    ) : null}

                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-xl border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-100 hover:text-blue-800"
                    >
                      <Link href={bidHref} className="whitespace-nowrap">
                        <Edit className="mr-2 size-4" />
                        Otvori ponudu
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
