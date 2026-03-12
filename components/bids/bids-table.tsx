"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { BidStatus } from "@/types/database";
import {
  BID_STATUSES,
  BID_STATUS_LABELS,
} from "@/lib/bids/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Filter, Briefcase, Calendar, Building2 } from "lucide-react";

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
}

interface BidsTableProps {
  bids: BidRow[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  in_review: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-red-50 text-red-700 border-red-200",
};

export function BidsTable({ bids }: BidsTableProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return bids;
    return bids.filter((b) => b.status === statusFilter);
  }, [bids, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 mr-2">
          <Filter className="size-4" />
          <span className="text-sm font-bold uppercase tracking-wider">Filteri:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10 rounded-xl border-slate-200 text-sm focus:ring-primary focus:border-primary">
            <SelectValue placeholder="Svi statusi" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 shadow-lg">
            <SelectItem value="all" className="focus:bg-blue-50 focus:text-primary cursor-pointer rounded-lg">Svi statusi</SelectItem>
            {BID_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="focus:bg-blue-50 focus:text-primary cursor-pointer rounded-lg">
                {BID_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20">
          <div className="flex size-16 items-center justify-center rounded-full bg-white shadow-sm mb-4">
            <Briefcase className="size-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">
            {bids.length === 0 ? "Nemate aktivnih ponuda" : "Nema rezultata"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm text-center">
            {bids.length === 0
              ? 'Započnite klikom na dugme "Nova ponuda" iznad.'
              : "Pokušajte promijeniti filtere za pretragu."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Naziv tendera</th>
                <th className="px-6 py-4 font-bold">Naručilac</th>
                <th className="px-6 py-4 font-bold">Rok</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Akcija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((bid) => (
                <tr
                  key={bid.id}
                  className="group hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 line-clamp-1 max-w-[300px]" title={bid.tender.title}>
                      {bid.tender.title}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 className="size-3.5 text-slate-400" />
                      <span className="text-sm font-medium truncate max-w-[200px]" title={bid.tender.contracting_authority || ""}>
                        {bid.tender.contracting_authority || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="size-3.5 text-slate-400" />
                      <span className="text-sm font-medium">
                        {formatDate(bid.tender.deadline)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[bid.status] || STATUS_STYLES.draft}`}
                    >
                      {BID_STATUS_LABELS[bid.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/bids/${bid.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50">
                        <Eye className="size-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
