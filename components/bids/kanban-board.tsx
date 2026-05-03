"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateBidFieldsAction } from "@/app/actions/bids";
import { BID_STATUS_LABELS } from "@/lib/bids/constants";
import type { BidStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface KanbanBid {
  id: string;
  status: BidStatus;
  tender_id: string;
  tender_title: string;
  authority_name: string | null;
  bid_value: number | null;
  estimated_value: number | null;
  deadline: string | null;
  priority_score?: number | null;
  win_probability?: number | null;
  estimated_effort?: string | null;
  recommendation?: string | null;
}

export interface KanbanColumn {
  status: BidStatus;
  label: string;
  accent: string; // tailwind bg class
  dotClass: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { status: "draft",     label: BID_STATUS_LABELS.draft,     accent: "bg-slate-50 border-slate-200",     dotClass: "bg-slate-400" },
  { status: "in_review", label: BID_STATUS_LABELS.in_review, accent: "bg-amber-50 border-amber-200",     dotClass: "bg-amber-500" },
  { status: "submitted", label: BID_STATUS_LABELS.submitted, accent: "bg-blue-50 border-blue-200",       dotClass: "bg-blue-500" },
  { status: "won",       label: BID_STATUS_LABELS.won,       accent: "bg-emerald-50 border-emerald-200", dotClass: "bg-emerald-500" },
  { status: "lost",      label: BID_STATUS_LABELS.lost,      accent: "bg-rose-50 border-rose-200",       dotClass: "bg-rose-500" },
];

function fmtMoney(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(v) + " KM";
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v));
  } catch {
    return "—";
  }
}

function daysLeft(v: string | null): number | null {
  if (!v) return null;
  const ms = new Date(v).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function KanbanBoard({ initialBids }: { initialBids: KanbanBid[] }) {
  const [bids, setBids] = useState<KanbanBid[]>(initialBids);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<BidStatus | null>(null);
  const [outcomeBid, setOutcomeBid] = useState<KanbanBid | null>(null);
  const [outcomeStatus, setOutcomeStatus] = useState<"won" | "lost">("won");
  const [outcomeValue, setOutcomeValue] = useState("");
  const [, startTransition] = useTransition();

  const byStatus = KANBAN_COLUMNS.reduce<Record<BidStatus, KanbanBid[]>>((acc, col) => {
    acc[col.status] = bids.filter((b) => b.status === col.status);
    return acc;
  }, {} as Record<BidStatus, KanbanBid[]>);

  function onDragStart(e: React.DragEvent, bidId: string) {
    setDragId(bidId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, col: BidStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  }

  function onDrop(e: React.DragEvent, col: BidStatus) {
    e.preventDefault();
    setOverCol(null);
    if (!dragId) return;

    // Optimistic update
    const moved = bids.find((b) => b.id === dragId);
    if (!moved || moved.status === col) return;
    setBids((xs) => xs.map((b) => (b.id === dragId ? { ...b, status: col } : b)));
    const position = byStatus[col].length;
    setDragId(null);

    if (col === "won") {
      setOutcomeBid(moved);
      setOutcomeStatus("won");
      setOutcomeValue(String(moved.bid_value ?? moved.estimated_value ?? ""));
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("bid_id", moved.id);
      fd.set("status", col);
      fd.set("kanban_position", String(position));
      await updateBidFieldsAction(fd);
    });
  }

  function saveOutcome() {
    if (!outcomeBid) return;
    const position = byStatus[outcomeStatus].length;
    const finalStatus = outcomeStatus;
    const finalValue = outcomeValue.trim();

    setBids((xs) =>
      xs.map((bid) =>
        bid.id === outcomeBid.id
          ? {
              ...bid,
              status: finalStatus,
              bid_value: finalValue ? Number(finalValue) : bid.bid_value,
            }
          : bid,
      ),
    );
    setOutcomeBid(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("bid_id", outcomeBid.id);
      fd.set("status", finalStatus);
      fd.set("kanban_position", String(position));
      if (finalValue) fd.set("bid_value", finalValue);
      await updateBidFieldsAction(fd);
    });
  }

  function cancelOutcome() {
    if (outcomeBid) {
      setBids((xs) =>
        xs.map((bid) => (bid.id === outcomeBid.id ? { ...bid, status: outcomeBid.status } : bid)),
      );
    }
    setOutcomeBid(null);
  }

  const totalActive = bids
    .filter((b) => b.status === "draft" || b.status === "in_review" || b.status === "submitted")
    .reduce((s, b) => s + (b.bid_value ?? b.estimated_value ?? 0), 0);
  const weightedActive = bids
    .filter((b) => b.status === "draft" || b.status === "in_review" || b.status === "submitted")
    .reduce((s, b) => s + (b.bid_value ?? b.estimated_value ?? 0) * ((b.win_probability ?? 0) / 100), 0);
  const avgPriority = bids.length > 0
    ? Math.round(bids.reduce((s, b) => s + (b.priority_score ?? 0), 0) / bids.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI header */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Vrijednost aktivnih ponuda</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">{fmtMoney(totalActive)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Nacrt + U pripremi + Predano
          </div>
        </div>
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Ponderisana vrijednost</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">{fmtMoney(weightedActive)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Vrijednost × šansa za pobjedu
          </div>
        </div>
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Prosječni prioritet</div>
          <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">{avgPriority}/100</div>
          <div className="mt-1 text-xs text-slate-500">
            Šansa + vrijednost + rizik
          </div>
        </div>
        {KANBAN_COLUMNS.map((c) => (
          <div key={c.status} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2 rounded-full ${c.dotClass}`} />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</span>
            </div>
            <div className="mt-1 text-2xl font-heading font-bold tracking-tight text-slate-900">
              {byStatus[c.status].length}
            </div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {KANBAN_COLUMNS.map((col) => {
          const items = byStatus[col.status];
          const columnTotal = items.reduce((s, b) => s + (b.bid_value ?? b.estimated_value ?? 0), 0);
          return (
            <div
              key={col.status}
              onDragOver={(e) => onDragOver(e, col.status)}
              onDragLeave={() => setOverCol((v) => (v === col.status ? null : v))}
              onDrop={(e) => onDrop(e, col.status)}
              className={`flex min-h-[400px] flex-col rounded-2xl border ${col.accent} p-3 transition-colors ${
                overCol === col.status ? "ring-2 ring-blue-400 ring-offset-2" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full ${col.dotClass}`} />
                  <span className="text-sm font-semibold text-slate-900">{col.label}</span>
                  <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {items.length}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{fmtMoney(columnTotal)}</span>
              </div>

              <div className="flex-1 space-y-2">
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 p-4 text-center text-xs text-slate-500">
                    Prevucite karticu ovdje
                  </div>
                )}
                {items.map((b) => {
                  const d = daysLeft(b.deadline);
                  const dClass =
                    d === null
                      ? "text-slate-500"
                      : d < 0
                        ? "text-rose-600"
                        : d <= 2
                          ? "text-rose-600 font-semibold"
                          : d <= 7
                            ? "text-amber-600 font-semibold"
                            : "text-slate-600";
                  return (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, b.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
                        dragId === b.id ? "opacity-50" : ""
                      }`}
                    >
                      <Link href={`/dashboard/bids/${b.id}`} className="block">
                        <div className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-blue-700">
                          {b.tender_title}
                        </div>
                        {b.authority_name && (
                          <div className="mt-1 line-clamp-1 text-xs text-slate-600">{b.authority_name}</div>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-900">
                            {fmtMoney(b.bid_value ?? b.estimated_value)}
                          </span>
                          <span className={dClass}>
                            {b.deadline ? fmtDate(b.deadline) : "—"}
                            {d !== null && d >= 0 && d <= 7 && ` · ${d}d`}
                            {d !== null && d < 0 && " · istekao"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
                          <span className="rounded-lg bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                            P {b.priority_score ?? "—"}
                          </span>
                          <span className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                            Šansa {b.win_probability !== null && b.win_probability !== undefined ? `${b.win_probability}%` : "—"}
                          </span>
                          <span className="truncate rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-600" title={b.estimated_effort ?? undefined}>
                            {b.recommendation ?? "Plan"}
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(outcomeBid)} onOpenChange={(open) => !open && cancelOutcome()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potvrdi ishod ponude</DialogTitle>
            <DialogDescription>
              Kartica je prebačena u završnu fazu. Evidentirajte stvarni ishod i finalnu vrijednost prije spremanja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="line-clamp-2 text-sm font-semibold text-slate-950">{outcomeBid?.tender_title}</p>
              <p className="mt-1 text-xs text-slate-500">{outcomeBid?.authority_name ?? "Nepoznat naručilac"}</p>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Ishod</span>
              <select
                value={outcomeStatus}
                onChange={(event) => setOutcomeStatus(event.target.value as "won" | "lost")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="won">Dobijeno</option>
                <option value="lost">Izgubljeno</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Finalna vrijednost</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={outcomeValue}
                onChange={(event) => setOutcomeValue(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                placeholder="npr. 125000"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelOutcome}>Odustani</Button>
            <Button onClick={saveOutcome}>Spremi ishod</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
