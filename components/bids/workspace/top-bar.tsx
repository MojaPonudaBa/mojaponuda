"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BidStatus } from "@/types/database";
import { BID_STATUSES, BID_STATUS_LABELS } from "@/lib/bids/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Download,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

interface TopBarProps {
  bidId: string;
  tenderTitle: string;
  contractingAuthority: string | null;
  currentStatus: BidStatus;
  initialRiskFlags?: string[];
  hasMissingItems?: boolean;
  backHref?: string;
  deleteRedirectHref?: string;
}

const STATUS_COLORS = {
  draft: "bg-slate-500",
  in_review: "bg-amber-500",
  submitted: "bg-blue-600",
  won: "bg-emerald-600",
  lost: "bg-red-600",
};

export function TopBar({
  bidId,
  tenderTitle,
  contractingAuthority,
  currentStatus,
  initialRiskFlags = [],
  hasMissingItems = false,
  backHref = "/dashboard/bids",
  deleteRedirectHref = "/dashboard/bids",
}: TopBarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<BidStatus>(currentStatus);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [riskFlags] = useState<string[]>(initialRiskFlags);
  const [riskDismissed, setRiskDismissed] = useState(false);

  async function handleStatusChange(newStatus: string) {
    const nextStatus = newStatus as BidStatus;
    const previousStatus = status;

    setStatus(nextStatus);
    setStatusLoading(true);

    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Nismo uspjeli promijeniti status.");
      }
    } catch (error) {
      setStatus(previousStatus);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nismo uspjeli promijeniti status.",
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Da li ste sigurni da želite obrisati ovu ponudu? Ova radnja se ne može vratiti.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Greška pri brisanju ponude.");
      }

      router.push(deleteRedirectHref);
    } catch (error) {
      setDeleting(false);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Greška pri komunikaciji sa serverom.",
        variant: "destructive",
      });
    }
  }

  function handleDownload() {
    if (hasMissingItems) {
      const confirmed = window.confirm(
        "Upozorenje: Nedostaju neki obavezni dokumenti iz liste. Želite li ipak preuzeti paket?"
      );

      if (!confirmed) {
        return;
      }
    }

    window.open(`/api/bids/package?bid_id=${bidId}`, "_blank");
  }

  return (
    <div className="space-y-4">
      {riskFlags.length > 0 && !riskDismissed ? (
        <div className="relative rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <button
            onClick={() => setRiskDismissed(true)}
            className="absolute right-3 top-3 text-red-400 transition-colors hover:text-red-600"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-900">Upozorenja za moguću diskvalifikaciju</p>
              <ul className="mt-2 space-y-1">
                {riskFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-red-400" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <Link href={backHref}>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 shrink-0 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div className="min-w-0 space-y-1">
              <h2 className="truncate font-heading text-xl font-bold leading-tight text-slate-900" title={tenderTitle}>
                {tenderTitle}
              </h2>
              {contractingAuthority ? (
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <Building2 className="size-3.5" />
                  <p className="truncate">{contractingAuthority}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Select value={status} onValueChange={(value) => void handleStatusChange(value)}>
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/50 font-medium focus:border-primary focus:ring-primary sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
              {BID_STATUSES.map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption} className="cursor-pointer rounded-lg focus:bg-slate-50">
                  <span className="inline-flex items-center gap-2">
                    <span className={`inline-block size-2 rounded-full ${STATUS_COLORS[statusOption] || "bg-slate-400"}`} />
                    {BID_STATUS_LABELS[statusOption]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={deleting || statusLoading}
              className="h-10 flex-1 rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20 sm:flex-none"
            >
              {statusLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Preuzmi
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={deleting || statusLoading}
              className="h-10 flex-1 rounded-xl border-red-200 font-bold text-red-600 hover:bg-red-50 hover:text-red-700 sm:flex-none"
              title="Obriši ponudu"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
