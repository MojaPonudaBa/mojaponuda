"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BidChecklistItem, ChecklistStatus, Document } from "@/types/database";
import { getExpiryStatus, getExpiryBadgeClasses, formatExpiryText, AI_TO_VAULT_TYPE_MAP } from "@/lib/vault/constants";
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
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  FileText,
  Link2,
  Loader2,
  Check,
  X,
  ListTodo,
  Sparkles
} from "lucide-react";
import { AddDocumentModal } from "@/components/vault/add-document-modal";

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

export function ChecklistPanel({ bidId, items, vaultDocuments, onViewPage }: ChecklistPanelProps) {
  const router = useRouter();
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

  const confirmedCount = items.filter((i) => i.status === "confirmed").length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

  const addItem = useCallback(async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    await fetch(`/api/bids/${bidId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        risk_note: newRisk.trim() || null,
      }),
    });
    setNewTitle("");
    setNewDesc("");
    setNewRisk("");
    setAddOpen(false);
    setLoading(false);
    router.refresh();
  }, [bidId, newTitle, newDesc, newRisk, router]);

  const updateItem = useCallback(
    async (itemId: string, updates: Record<string, unknown>) => {
      await fetch(`/api/bids/${bidId}/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      router.refresh();
    },
    [bidId, router]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      await fetch(`/api/bids/${bidId}/checklist/${itemId}`, { method: "DELETE" });
      router.refresh();
    },
    [bidId, router]
  );

  const saveEdit = useCallback(async () => {
    if (!editingId || !editTitle.trim()) return;
    await updateItem(editingId, {
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      risk_note: editRisk.trim() || null,
    });
    setEditingId(null);
  }, [editingId, editTitle, editDesc, editRisk, updateItem]);

  const attachDocument = useCallback(
    async (docId: string) => {
      if (!attachItemId) return;
      await updateItem(attachItemId, {
        document_id: docId,
        status: "attached",
      });
      // Also add to bid_documents
      await fetch(`/api/bids/${bidId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId }),
      });
      setAttachModalOpen(false);
      setAttachItemId(null);
    },
    [attachItemId, bidId, updateItem]
  );

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
function findSuggestedDocument(item: BidChecklistItem): Document | undefined {
    if (!item.document_type) return undefined;
    const targetType = AI_TO_VAULT_TYPE_MAP[item.document_type];
    if (!targetType) return undefined;

    // Find first non-expired document of this type
    return vaultDocuments.find((doc) => {
      const isTypeMatch = doc.type === targetType;
      const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date();
      return isTypeMatch && !isExpired;
    });
  }

  
  return (
    <div className="flex flex-col gap-6 rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-slate-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ListTodo className="size-5" />
          </div>
          <h3 className="font-heading font-bold text-lg">
            Lista zahtjeva
          </h3>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl font-bold shadow-blue-500/20 shadow-md">
          <Plus className="mr-2 size-3.5" />
          Dodaj stavku
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-700">Napredak pripreme</span>
          <span className="font-mono font-medium text-slate-500">
            {confirmedCount}/{totalCount} ({progressPct}%)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Lista stavki */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
             <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-blue-50">
               <Sparkles className="size-6 text-blue-400" />
             </div>
             <p className="text-sm font-medium text-slate-900">Čekamo tendersku dokumentaciju</p>
             <p className="text-xs text-slate-500 max-w-[240px] mt-1">
               Uploadajte tendersku dokumentaciju iznad da bismo generisali tačnu listu zahtjeva za ovaj tender.
             </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md"
            >
              {editingId === item.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Naziv stavke"
                    className="h-10 text-sm font-medium"
                    autoFocus
                  />
                  <Input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Opis (opciono)"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={editRisk}
                    onChange={(e) => setEditRisk(e.target.value)}
                    placeholder="Napomena o riziku (opciono)"
                    className="h-9 text-sm border-red-200 focus:border-red-400 focus:ring-red-400/20"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveEdit} className="h-8">
                      <Check className="mr-1.5 size-3.5" /> Sačuvaj
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-8"
                    >
                      <X className="mr-1.5 size-3.5" /> Odustani
                    </Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-4">
                  {/* Status checkbox */}
                  <button
                    onClick={() => {
                      const next: ChecklistStatus =
                        item.status === "missing"
                          ? "attached"
                          : item.status === "attached"
                          ? "confirmed"
                          : "missing";
                      updateItem(item.id, { status: next });
                    }}
                    className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                      item.status === "confirmed"
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-sm scale-110"
                        : item.status === "attached"
                        ? "border-amber-400 bg-amber-50 text-amber-500"
                        : "border-slate-300 bg-slate-50 hover:border-blue-400"
                    }`}
                  >
                    {item.status === "confirmed" && <Check className="size-3.5 stroke-[3]" />}
                    {item.status === "attached" && <div className="size-2 rounded-full bg-amber-400" />}
                  </button>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-bold transition-colors ${
                          item.status === "confirmed"
                            ? "text-emerald-700 line-through decoration-emerald-300"
                            : "text-slate-900"
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.risk_note && (
                        <div className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          <AlertTriangle className="size-3" />
                          RIZIK
                        </div>
                      )}
                    </div>

                    {(item.page_reference || item.description || item.source_text) && (
                      <div className="mb-2 space-y-1.5">
                        {item.page_reference && (
                          <button
                            onClick={() => onViewPage?.(item.page_number ?? 1, item.source_text ?? undefined)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors cursor-pointer"
                          >
                            <FileText className="size-3" />
                            {item.page_reference}
                            <span className="text-blue-400 ml-1">→ Pogledaj</span>
                          </button>
                        )}
                        {item.description && (
                          <p className="text-sm text-slate-500 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        {item.source_text && (
                          <blockquote className="border-l-2 border-slate-200 pl-3 text-xs text-slate-400 italic leading-relaxed">
                            {item.source_text}
                          </blockquote>
                        )}
                      </div>
                    )}

                    {item.risk_note && (
                      <p className="mb-2 text-xs font-medium text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                        {item.risk_note}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>

                      {item.document_id ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 border border-blue-100">
                          <FileText className="size-3" />
                          Dokument priložen
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px] rounded-lg border-dashed border-slate-300 hover:border-primary hover:text-primary hover:bg-blue-50"
                            onClick={() => openAttachModal(item.id)}
                          >
                            <Link2 className="mr-1.5 size-3" />
                            Iz Vaulta
                          </Button>
                          
                          <AddDocumentModal 
                            initialType={item.document_type ? AI_TO_VAULT_TYPE_MAP[item.document_type] : undefined}
                            onSuccess={(doc) => {
                              setAttachItemId(item.id);
                              // Reuse attach logic
                              const attach = async () => {
                                await updateItem(item.id, {
                                  document_id: doc.id,
                                  status: "attached",
                                });
                                await fetch(`/api/bids/${bidId}/documents`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ document_id: doc.id }),
                                });
                                setAttachItemId(null);
                                router.refresh();
                              };
                              attach();
                            }}
                            trigger={
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[10px] rounded-lg border-dashed border-slate-300 hover:border-primary hover:text-primary hover:bg-blue-50"
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

                  {/* Akcije */}
                  <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {/* Delete removed as requested */}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Dodaj stavku */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-slate-100 bg-white sm:max-w-md p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-slate-900">Dodaj stavku na listu</DialogTitle>
            <DialogDescription className="text-slate-500">
              Definišite novi zahtjev ili dokument koji je potreban za ovu ponudu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Naziv *</label>
              <Input
                placeholder="npr. Potvrda o solventnosti"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Opis</label>
              <Input
                placeholder="Dodatne informacije..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-red-400">Rizik</label>
              <Input
                placeholder="Upozorenje na potencijalni problem..."
                value={newRisk}
                onChange={(e) => setNewRisk(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-red-200 focus:ring-red-400/20 focus:border-red-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={loading} className="rounded-xl font-bold text-slate-500 hover:text-slate-900">
              Odustani
            </Button>
            <Button onClick={addItem} disabled={loading || !newTitle.trim()} className="rounded-xl font-bold shadow-lg shadow-blue-500/20">
              {loading && <Loader2 className="mr-2 animate-spin" />}
              Dodaj stavku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Priloži dokument iz Vaulta */}
      <Dialog open={attachModalOpen} onOpenChange={setAttachModalOpen}>
        <DialogContent className="border-slate-100 bg-white sm:max-w-md p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-slate-900">Priloži iz Trezora</DialogTitle>
            <DialogDescription className="text-slate-500">
              Odaberite postojeći dokument iz vašeg trezora.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {vaultDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="size-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-900">Prazan trezor</p>
                <p className="text-xs text-slate-500">Nemate dokumenata u Vaultu.</p>
              </div>
            ) : (
              vaultDocuments.map((doc) => {
                const expiryStatus = getExpiryStatus(doc.expires_at);
                const badgeClasses = getExpiryBadgeClasses(expiryStatus);
                return (
                  <button
                    key={doc.id}
                    onClick={() => attachDocument(doc.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-900">{doc.name}</p>
                      {doc.type && (
                        <p className="text-xs text-slate-500">{doc.type}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${badgeClasses}`}
                    >
                      {formatExpiryText(doc.expires_at)}
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
