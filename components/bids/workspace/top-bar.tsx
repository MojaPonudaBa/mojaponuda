"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BidStatus } from "@/types/database";
import { BID_STATUSES, BID_STATUS_LABELS, BID_STATUS_CLASSES } from "@/lib/bids/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Brain, Download, ArrowLeft, Loader2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  bidId: string;
  tenderTitle: string;
  contractingAuthority: string | null;
  currentStatus: BidStatus;
  initialRiskFlags?: string[];
}

export function TopBar({
  bidId,
  tenderTitle,
  contractingAuthority,
  currentStatus,
  initialRiskFlags = [],
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
    <div className="space-y-2">
      {/* Risk flags banner */}
      {riskFlags.length > 0 && !riskDismissed && (
        <div className="relative rounded-md border border-red-500/30 bg-red-500/10 p-3">
          <button
            onClick={() => setRiskDismissed(true)}
            className="absolute right-2 top-2 text-red-400 hover:text-red-300"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-400">
                Upozorenja za diskvalifikaciju
              </p>
              <ul className="mt-1 space-y-0.5">
                {riskFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-red-300">
                    • {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Analyze error */}
      {analyzeError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {analyzeError}
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/bids">
              <Button variant="ghost" size="icon-xs">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight">
                {tenderTitle}
              </h2>
              {contractingAuthority && (
                <p className="truncate text-sm text-muted-foreground">
                  {contractingAuthority}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select value={currentStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BID_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className={`inline-flex items-center gap-1.5`}>
                    <span
                      className={`inline-block size-2 rounded-full ${
                        s === "draft"
                          ? "bg-muted-foreground"
                          : s === "in_review"
                          ? "bg-amber-400"
                          : s === "submitted"
                          ? "bg-blue-400"
                          : s === "won"
                          ? "bg-emerald-400"
                          : "bg-red-400"
                      }`}
                    />
                    {BID_STATUS_LABELS[s]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Brain className="size-3.5" />
            )}
            {analyzing ? "Analizira..." : "Analiza s AI"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(`/api/bids/export?bid_id=${bidId}`, "_blank");
            }}
          >
            <Download className="size-3.5" />
            Izvoz paketa
          </Button>
        </div>
      </div>
    </div>
  );
}
