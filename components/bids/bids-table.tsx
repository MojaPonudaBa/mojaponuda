"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  XCircle,
} from "lucide-react";

interface BidRow {
  id: string;
  status: BidStatus;
  created_at: string;
  tender: {
    id: string;
    title: string;
    contracting_authority: string | null;
    deadline: string | null;
  };
  clientName?: string;
}

interface BidsTableProps {
  bids: BidRow[];
  showClientColumn?: boolean;
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
  draft: "border-slate-500/25 bg-slate-500/10 text-slate-100",
  in_review: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  submitted: "border-sky-500/25 bg-sky-500/10 text-sky-100",
  won: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  lost: "border-rose-500/25 bg-rose-500/10 text-rose-100",
};

export function BidsTable({ bids, showClientColumn = false }: BidsTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return bids;
    return bids.filter((bid) => bid.status === statusFilter);
  }, [bids, statusFilter]);

  async function updateBidStatus(bidId: string, newStatus: BidStatus) {
    setUpdatingId(bidId);
    try {
      await fetch(`/api/bids/${bidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5 text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-300">
              <Filter className="size-4" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">Pregled ponuda</h3>
              <p className="text-sm text-slate-400">Status, rokovi i akcije složeni za brzi operativni rad.</p>
            </div>
          </div>
          <div className="w-full max-w-[240px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/5 text-sm text-white">
                <SelectValue placeholder="Svi statusi" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-700 bg-slate-950 text-slate-200">
                <SelectItem value="all" className="rounded-xl focus:bg-white/10 focus:text-white">Svi statusi</SelectItem>
                {BID_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="rounded-xl focus:bg-white/10 focus:text-white">
                    {BID_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Briefcase className="size-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-heading font-bold text-white">
            {bids.length === 0 ? "Nemate aktivnih ponuda" : "Nema rezultata"}
          </h3>
          <p className="max-w-sm text-sm text-slate-400">
            {bids.length === 0
              ? 'Započnite klikom na dugme "Nova ponuda" iznad.'
              : "Pokušajte promijeniti filtere za pretragu."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bid) => (
            <article
              key={bid.id}
              className="rounded-[1.5rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5 text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[bid.status] || STATUS_STYLES.draft}`}>
                      {BID_STATUS_LABELS[bid.status]}
                    </span>
                    {showClientColumn && bid.clientName ? (
                      <span className="inline-flex max-w-full items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">
                        <span className="truncate">{bid.clientName}</span>
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 line-clamp-2 text-lg font-semibold leading-7 text-white">
                    {bid.tender.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                    <span className="inline-flex max-w-full items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-slate-500" />
                      <span className="truncate" title={bid.tender.contracting_authority ?? ""}>
                        {bid.tender.contracting_authority ?? "Nepoznat naručilac"}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="size-4 shrink-0 text-slate-500" />
                      {formatDate(bid.tender.deadline)}
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
                        className="h-11 rounded-2xl border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 hover:text-emerald-50"
                      >
                        {updatingId === bid.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                        Dobijeno
                      </Button>
                      <Button
                        variant="outline"
                        disabled={updatingId === bid.id}
                        onClick={() => updateBidStatus(bid.id, "lost")}
                        className="h-11 rounded-2xl border-rose-500/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 hover:text-rose-50"
                      >
                        {updatingId === bid.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <XCircle className="mr-2 size-4" />}
                        Izgubljeno
                      </Button>
                    </>
                  ) : null}

                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <Link href={`/dashboard/bids/${bid.id}`} className="whitespace-nowrap">
                      <Edit className="mr-2 size-4" />
                      Otvori ponudu
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
