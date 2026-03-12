"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BidChecklistItem, ChecklistStatus, Document } from "@/types/database";
import { getExpiryStatus, getExpiryBadgeClasses, formatExpiryText } from "@/lib/vault/constants";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  missing: "Nedostaje",
  attached: "Priloženo",
  confirmed: "Potvrđeno",
};

const STATUS_CLASSES: Record<ChecklistStatus, string> = {
  missing: "border-red-500/30 bg-red-500/10 text-red-400",
  attached: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

interface ChecklistPanelProps {
  bidId: string;
  items: BidChecklistItem[];
  vaultDocuments: Document[];
}

export function ChecklistPanel({ bidId, items, vaultDocuments }: ChecklistPanelProps) {
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

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Checklist zahtjeva
        </h3>
        <Button size="xs" onClick={() => setAddOpen(true)}>
          <Plus className="size-3" />
          Dodaj
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Kompletiranost</span>
          <span className="font-mono text-foreground">
            {confirmedCount}/{totalCount} ({progressPct}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Lista stavki */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nema stavki. Dodajte zahtjeve za ovu ponudu.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group rounded-md border border-border p-3 transition-colors hover:border-primary/20"
            >
              {editingId === item.id ? (
                /* Edit mode */
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Naziv stavke"
                    className="text-sm"
                  />
                  <Input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Opis (opciono)"
                    className="text-sm"
                  />
                  <Input
                    value={editRisk}
                    onChange={(e) => setEditRisk(e.target.value)}
                    placeholder="Napomena o riziku (opciono)"
                    className="text-sm"
                  />
                  <div className="flex gap-1">
                    <Button size="xs" onClick={saveEdit}>
                      <Check className="size-3" /> Sačuvaj
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-3" /> Odustani
                    </Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-3">
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
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      item.status === "confirmed"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : item.status === "attached"
                        ? "border-amber-500 bg-amber-500/20"
                        : "border-border"
                    }`}
                  >
                    {item.status === "confirmed" && <Check className="size-3" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          item.status === "confirmed"
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.risk_note && (
                        <AlertTriangle className="size-3.5 shrink-0 text-red-400" />
                      )}
                    </div>

                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    {item.risk_note && (
                      <p className="mt-1 text-xs text-red-400">
                        ⚠ {item.risk_note}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>

                      {item.document_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <FileText className="size-2.5" />
                          Dokument priložen
                        </span>
                      ) : (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => openAttachModal(item.id)}
                        >
                          <Link2 className="size-2.5" />
                          Priloži iz Vaulta
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Akcije */}
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Dodaj stavku */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj stavku checklista</DialogTitle>
            <DialogDescription>
              Dodajte zahtjev koji je potreban za ovu ponudu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Naziv stavke *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={loading}
            />
            <Input
              placeholder="Opis (opciono)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              disabled={loading}
            />
            <Input
              placeholder="Napomena o riziku (opciono)"
              value={newRisk}
              onChange={(e) => setNewRisk(e.target.value)}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={loading}>
              Odustani
            </Button>
            <Button onClick={addItem} disabled={loading || !newTitle.trim()}>
              {loading && <Loader2 className="animate-spin" />}
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Priloži dokument iz Vaulta */}
      <Dialog open={attachModalOpen} onOpenChange={setAttachModalOpen}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Priloži dokument iz Vaulta</DialogTitle>
            <DialogDescription>
              Odaberite dokument koji želite priložiti uz ovu stavku.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {vaultDocuments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nemate dokumenata u Vaultu.
              </p>
            ) : (
              vaultDocuments.map((doc) => {
                const expiryStatus = getExpiryStatus(doc.expires_at);
                const badgeClasses = getExpiryBadgeClasses(expiryStatus);
                return (
                  <button
                    key={doc.id}
                    onClick={() => attachDocument(doc.id)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <FileText className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      {doc.type && (
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${badgeClasses}`}
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
