"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { BidStatus } from "@/types/database";
import {
  BID_STATUSES,
  BID_STATUS_LABELS,
  BID_STATUS_CLASSES,
} from "@/lib/bids/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink } from "lucide-react";

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

export function BidsTable({ bids }: BidsTableProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return bids;
    return bids.filter((b) => b.status === statusFilter);
  }, [bids, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Svi statusi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi statusi</SelectItem>
            {BID_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {BID_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            {bids.length === 0
              ? 'Nemate ponuda. Kliknite "Nova ponuda" za početak.'
              : "Nema ponuda s odabranim statusom."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Naziv tendera
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Naručilac
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Rok
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Kreirano
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Akcija
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bid) => (
                <tr
                  key={bid.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="max-w-[280px] truncate px-4 py-3 font-medium">
                    {bid.tender.title}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {bid.tender.contracting_authority || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {formatDate(bid.tender.deadline)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${BID_STATUS_CLASSES[bid.status]}`}
                    >
                      {BID_STATUS_LABELS[bid.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {formatDate(bid.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/bids/${bid.id}`}>
                      <Button variant="outline" size="xs">
                        <ExternalLink className="size-3" />
                        Otvori
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
