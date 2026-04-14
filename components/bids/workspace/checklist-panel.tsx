"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BidChecklistItem, ChecklistStatus, Document } from "@/types/database";
import {
  AI_TO_VAULT_TYPE_MAP,
  formatExpiryText,
  getExpiryBadgeClasses,
  getExpiryStatus,
} from "@/lib/vault/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Check,
  FileText,
  Link2,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { useToast } from "@/components/ui/use-toast";

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  missing: "Nedostaje",
  attached: "Priloženo",
  confirmed: "Potvrđeno",
};

const STATUS_CLASSES: Record<ChecklistStatus, string> = {
  missing: "bg-red-50 text-red-600 border-red-100",
  attached: "bg-amber-50 text-amber-600 border-amber-100",
  confirmed: "bg-emerald-50 text-emerald-600 border-emerald-100",
};

interface ChecklistPanelProps {
  bidId: string;
  items: BidChecklistItem[];
  vaultDocuments: Document[];
  onViewPage?: (pageNumber: number, highlightText?: string) => void;
}

function sortChecklistItems(items: BidChecklistItem[]) {
  return [...items].sort((left, right) => left.sort_order - right.sort_order);
}

function getNextChecklistStatus(status: ChecklistStatus): ChecklistStatus {
  if (status === "missing") return "attached";
  if (status === "attached") return "confirmed";
  return "missing";
}

export function ChecklistPanel({ bidId, items, vaultDocuments, onViewPage }: ChecklistPanelProps) {
  const { toast } = useToast();
  const [checklistItems, setChecklistItems] = useState(() => sortChecklistItems(items));
  const [documents, setDocuments] = useState(() => vaultDocuments);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRisk, setEditRisk] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRisk, setNewRisk] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [attachItemId, setAttachItemId] = useState<string | null>(null);
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);

  useEffect(() => {
    setChecklistItems(sortChecklistItems(items));
  }, [items]);

  useEffect(() => {
    setDocuments(vaultDocuments);
  }, [vaultDocuments]);

  const confirmedCount = useMemo(
    () => checklistItems.filter((item) => item.status === "confirmed").length,
    [checklistItems]
  );
  const totalCount = checklistItems.length;
  const progressPct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

  function setItemSaving(itemId: string, saving: boolean) {
    setSavingItemIds((current) =>
      saving ? [...new Set([...current, itemId])] : current.filter((value) => value !== itemId)
    );
  }

  function mergeUpdatedItem(updatedItem: BidChecklistItem) {
    setChecklistItems((current) =>
      sortChecklistItems(
        current.some((item) => item.id === updatedItem.id)
          ? current.map((item) => (item.id === updatedItem.id ? updatedItem : item))
          : [...current, updatedItem]
      )
    );
  }

  async function createItem() {
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/bids/${bidId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          risk_note: newRisk.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nismo uspjeli dodati stavku.");
      }

      mergeUpdatedItem(data.item as BidChecklistItem);
      setNewTitle("");
      setNewDesc("");
      setNewRisk("");
      setAddOpen(false);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nismo uspjeli dodati stavku.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const updateItem = useCallback(
    async (itemId: string, updates: Record<string, unknown>) => {
      const response = await fetch(`/api/bids/${bidId}/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nismo uspjeli sačuvati izmjene.");
      }

      const updatedItem = data.item as BidChecklistItem;
      mergeUpdatedItem(updatedItem);
      return updatedItem;
    },
    [bidId]
  );

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;

    setItemSaving(editingId, true);
    try {
      await updateItem(editingId, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        risk_note: editRisk.trim() || null,
      });
      setEditingId(null);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nismo uspjeli sačuvati izmjene.",
        variant: "destructive",
      });
    } finally {
      setItemSaving(editingId, false);
    }
  }

  async function attachDocumentToBid(documentId: string) {
    const response = await fetch(`/api/bids/${bidId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId }),
    });

    if (response.ok || response.status === 409) {
      return;
    }

    const data = await response.json();
    throw new Error(data.error || "Nismo uspjeli priložiti dokument.");
  }

  async function attachDocument(itemId: string, documentId: string) {
    const previousItem = checklistItems.find((item) => item.id === itemId);
    if (!previousItem) return;

    const optimisticItem: BidChecklistItem = {
      ...previousItem,
      document_id: documentId,
      status: "attached",
    };

    mergeUpdatedItem(optimisticItem);
    setItemSaving(itemId, true);

    try {
      await updateItem(itemId, {
        document_id: documentId,
        status: "attached",
      });
      await attachDocumentToBid(documentId);
      setAttachModalOpen(false);
      setAttachItemId(null);
    } catch (error) {
      mergeUpdatedItem(previousItem);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nismo uspjeli priložiti dokument.",
        variant: "destructive",
      });
    } finally {
      setItemSaving(itemId, false);
    }
  }

  async function cycleItemStatus(item: BidChecklistItem) {
    const nextStatus = getNextChecklistStatus(item.status);
    const previousItem = item;

    mergeUpdatedItem({ ...item, status: nextStatus });
    setItemSaving(item.id, true);

    try {
      await updateItem(item.id, { status: nextStatus });
    } catch (error) {
      mergeUpdatedItem(previousItem);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nismo uspjeli promijeniti status.",
        variant: "destructive",
      });
    } finally {
      setItemSaving(item.id, false);
    }
  }

  function startEdit(item: BidChecklistItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditRisk(item.risk_note || "");
  }

  function openAttachModal(itemId: string) {
    setAttachItemId(itemId);
    setAttachModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-slate-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ListTodo className="size-5" />
          </div>
          <h3 className="font-heading text-lg font-bold">Lista zahtjeva</h3>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl font-bold shadow-md shadow-blue-500/20">
          <Plus className="mr-2 size-3.5" />
          Dodaj stavku
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-700">Napredak pripreme</span>
          <span className="font-mono font-medium text-slate-500">
            {confirmedCount}/{totalCount} ({progressPct}%)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {checklistItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-blue-50">
              <Sparkles className="size-6 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">Čekamo tendersku dokumentaciju</p>
            <p className="mt-1 max-w-[240px] text-xs text-slate-500">
              Učitajte tendersku dokumentaciju iznad da bismo napravili tačnu listu zahtjeva za ovaj tender.
            </p>
          </div>
        ) : (
          checklistItems.map((item) => {
            const isSaving = savingItemIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md"
              >
                {editingId === item.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      placeholder="Naziv stavke"
                      className="h-10 text-sm font-medium"
                      autoFocus
                    />
                    <Input
                      value={editDesc}
                      onChange={(event) => setEditDesc(event.target.value)}
                      placeholder="Opis"
                      className="h-9 text-sm"
                    />
                    <Input
                      value={editRisk}
                      onChange={(event) => setEditRisk(event.target.value)}
                      placeholder="Napomena o riziku"
                      className="h-9 border-red-200 text-sm focus:border-red-400 focus:ring-red-400/20"
                    />
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={saveEdit} className="h-8" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
                        Sačuvaj
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="h-8"
                        disabled={isSaving}
                      >
                        <X className="mr-1.5 size-3.5" />
                        Odustani
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => void cycleItemStatus(item)}
                      disabled={isSaving}
                      className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                        item.status === "confirmed"
                          ? "scale-110 border-emerald-500 bg-emerald-500 text-white shadow-sm"
                          : item.status === "attached"
                            ? "border-amber-400 bg-amber-50 text-amber-500"
                            : "border-slate-300 bg-slate-50 hover:border-blue-400"
                      } ${isSaving ? "cursor-wait opacity-70" : ""}`}
                    >
                      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      {!isSaving && item.status === "confirmed" ? <Check className="size-3.5 stroke-[3]" /> : null}
                      {!isSaving && item.status === "attached" ? <div className="size-2 rounded-full bg-amber-400" /> : null}
                    </button>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`text-sm font-bold transition-colors ${
                            item.status === "confirmed"
                              ? "text-emerald-700 line-through decoration-emerald-300"
                              : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.risk_note ? (
                          <div className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            <AlertTriangle className="size-3" />
                            Rizik
                          </div>
                        ) : null}
                      </div>

                      {(item.page_reference || item.description || item.source_text) ? (
                        <div className="mb-2 space-y-1.5">
                          {item.page_reference ? (
                            <button
                              onClick={() => onViewPage?.(item.page_number ?? 1, item.source_text ?? undefined)}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                            >
                              <FileText className="size-3" />
                              {item.page_reference}
                              <span className="ml-1 text-blue-400">→ Pogledaj</span>
                            </button>
                          ) : null}
                          {item.description ? (
                            <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
                          ) : null}
                          {item.source_text ? (
                            <blockquote className="border-l-2 border-slate-200 pl-3 text-xs italic leading-relaxed text-slate-400">
                              {item.source_text}
                            </blockquote>
                          ) : null}
                        </div>
                      ) : null}

                      {item.risk_note ? (
                        <p className="mb-2 rounded-lg border border-red-100 bg-red-50 p-2 text-xs font-medium text-red-500">
                          {item.risk_note}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[item.status]}`}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>

                        {item.document_id ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                            <FileText className="size-3" />
                            Dokument je priložen
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg border-dashed border-slate-300 px-2 text-[10px] hover:border-primary hover:bg-blue-50 hover:text-primary"
                              onClick={() => openAttachModal(item.id)}
                              disabled={isSaving}
                            >
                              <Link2 className="mr-1.5 size-3" />
                              Iz trezora
                            </Button>

                            <AddDocumentModal
                              initialType={item.document_type ? AI_TO_VAULT_TYPE_MAP[item.document_type] : undefined}
                              onSuccess={(document) => {
                                setDocuments((current) =>
                                  current.some((entry) => entry.id === document.id)
                                    ? current
                                    : [document, ...current]
                                );
                                void attachDocument(item.id, document.id);
                              }}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-lg border-dashed border-slate-300 px-2 text-[10px] hover:border-primary hover:bg-blue-50 hover:text-primary"
                                  disabled={isSaving}
                                >
                                  <Plus className="mr-1.5 size-3" />
                                  Novi upload
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => startEdit(item)}
                        disabled={isSaving}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl border-slate-100 bg-white p-6 shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-slate-900">Dodaj stavku na listu</DialogTitle>
            <DialogDescription className="text-slate-500">
              Unesite novi zahtjev ili dokument koji je potreban za ovu ponudu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Naziv *</label>
              <Input
                placeholder="npr. Potvrda o solventnosti"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                disabled={loading}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Opis</label>
              <Input
                placeholder="Dodatne informacije"
                value={newDesc}
                onChange={(event) => setNewDesc(event.target.value)}
                disabled={loading}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-red-400">Rizik</label>
              <Input
                placeholder="Upozorenje na mogući problem"
                value={newRisk}
                onChange={(event) => setNewRisk(event.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-red-200 focus:border-red-400 focus:ring-red-400/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={loading}
              className="rounded-xl font-bold text-slate-500 hover:text-slate-900"
            >
              Odustani
            </Button>
            <Button
              onClick={() => void createItem()}
              disabled={loading || !newTitle.trim()}
              className="rounded-xl font-bold shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Dodaj stavku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attachModalOpen} onOpenChange={setAttachModalOpen}>
        <DialogContent className="rounded-2xl border-slate-100 bg-white p-6 shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-slate-900">Priloži iz trezora</DialogTitle>
            <DialogDescription className="text-slate-500">
              Odaberite postojeći dokument iz svog trezora.
            </DialogDescription>
          </DialogHeader>
          <div className="custom-scrollbar max-h-80 space-y-2 overflow-y-auto pr-2">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <FileText className="mb-2 size-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-900">Trezor je prazan</p>
                <p className="text-xs text-slate-500">Još nemate dokumenata u trezoru.</p>
              </div>
            ) : (
              documents.map((document) => {
                const expiryStatus = getExpiryStatus(document.expires_at);
                const badgeClasses = getExpiryBadgeClasses(expiryStatus);
                return (
                  <button
                    key={document.id}
                    onClick={() => attachItemId && void attachDocument(attachItemId, document.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-900">{document.name}</p>
                      {document.type ? <p className="text-xs text-slate-500">{document.type}</p> : null}
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${badgeClasses}`}>
                      {formatExpiryText(document.expires_at)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
