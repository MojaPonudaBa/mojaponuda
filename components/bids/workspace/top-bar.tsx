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
import { Brain, Download, ArrowLeft, Loader2, AlertTriangle, X, Building2 } from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  bidId: string;
  tenderTitle: string;
  contractingAuthority: string | null;
  currentStatus: BidStatus;
  initialRiskFlags?: string[];
  isSubscribed?: boolean;
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
  isSubscribed = false,
}: TopBarProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [riskFlags, setRiskFlags] = useState<string[]>(initialRiskFlags);
  const [riskDismissed, setRiskDismissed] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  async function handleStatusChange(newStatus: string) {
    await fetch(`/api/bids/${bidId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function handleAnalyze() {
    if (!isSubscribed) {
      router.push("/dashboard/subscription");
      return;
    }

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/bids/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid_id: bidId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAnalyzeError(data.error || "Analiza nije uspjela.");
        return;
      }

      if (data.analysis?.risk_flags?.length > 0) {
        setRiskFlags(data.analysis.risk_flags);
        setRiskDismissed(false);
      }

      router.refresh();
    } catch (err) {
      setAnalyzeError("Greška pri komunikaciji sa serverom.");
      console.error("Analyze error:", err);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Risk flags banner */}
      {riskFlags.length > 0 && !riskDismissed && (
        <div className="relative rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <button
            onClick={() => setRiskDismissed(true)}
            className="absolute right-3 top-3 text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-900">
                Upozorenja za diskvalifikaciju
              </p>
              <ul className="mt-2 space-y-1">
                {riskFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="block mt-1.5 size-1 rounded-full bg-red-400 shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Analyze error */}
      {analyzeError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm flex items-center gap-2">
          <AlertTriangle className="size-4 text-red-600" />
          {analyzeError}
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <Link href="/dashboard/bids">
              <Button variant="ghost" size="icon" className="shrink-0 text-slate-400 hover:text-slate-900 hover:bg-slate-50 -ml-2 rounded-xl">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-xl font-heading font-bold text-slate-900 leading-tight" title={tenderTitle}>
                {tenderTitle}
              </h2>
              {contractingAuthority && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <Building2 className="size-3.5" />
                  <p className="truncate">
                    {contractingAuthority}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select value={currentStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl border-slate-200 bg-slate-50/50 font-medium focus:ring-primary focus:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
              {BID_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="cursor-pointer rounded-lg focus:bg-slate-50">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-block size-2 rounded-full ${STATUS_COLORS[s] || "bg-slate-400"}`}
                    />
                    {BID_STATUS_LABELS[s]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary font-bold flex-1 sm:flex-none"
            >
              {analyzing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Brain className="mr-2 size-4 text-purple-500" />
              )}
              {analyzing ? "Analizira..." : "Analiza"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/api/bids/export?bid_id=${bidId}`, "_blank");
              }}
              className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary font-bold flex-1 sm:flex-none"
            >
              <Download className="mr-2 size-4 text-blue-500" />
              Izvoz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
