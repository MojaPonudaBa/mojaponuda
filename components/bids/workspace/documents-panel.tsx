"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Document } from "@/types/database";
import { getExpiryStatus, getExpiryBadgeClasses, formatExpiryText } from "@/lib/vault/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, X, AlertTriangle } from "lucide-react";

interface AttachedDoc {
  id: string;
  document: Document;
}

interface DocumentsPanelProps {
  bidId: string;
  attachedDocs: AttachedDoc[];
  vaultDocuments: Document[];
}

export function DocumentsPanel({
  bidId,
  attachedDocs,
  vaultDocuments,
}: DocumentsPanelProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const attachedIds = new Set(attachedDocs.map((d) => d.document.id));
  const availableDocs = vaultDocuments.filter((d) => !attachedIds.has(d.id));

  async function handleAttach(documentId: string) {
    await fetch(`/api/bids/${bidId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId }),
    });
    setAddOpen(false);
    router.refresh();
  }

  async function handleRemove(bidDocId: string) {
    await fetch(`/api/bids/${bidId}/documents/${bidDocId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Priloženi dokumenti
        </h3>
        <Button size="xs" onClick={() => setAddOpen(true)}>
          <Plus className="size-3" />
          Dodaj iz Trezora
        </Button>
      </div>

      {/* Lista priloženih dokumenata */}
      <div className="space-y-2">
        {attachedDocs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nema priloženih dokumenata.
          </p>
        ) : (
          attachedDocs.map((ad) => {
            const expiryStatus = getExpiryStatus(ad.document.expires_at);
            const badgeClasses = getExpiryBadgeClasses(expiryStatus);
            const expiryText = formatExpiryText(ad.document.expires_at);

            return (
              <div
                key={ad.id}
                className="group flex items-center gap-3 rounded-md border border-border p-2.5 transition-colors hover:border-primary/20"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ad.document.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {ad.document.type && (
                      <span className="text-[10px] text-muted-foreground">
                        {ad.document.type}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${badgeClasses}`}
                    >
                      {expiryStatus === "danger" && (
                        <AlertTriangle className="size-2.5" />
                      )}
                      {expiryText}
                    </span>
                  </div>
                </div>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleRemove(ad.id)}
                >
                  <X className="size-3 text-red-400" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Dodaj iz Trezora */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj dokument iz Trezora</DialogTitle>
            <DialogDescription>
              Odaberite dokument koji želite priložiti uz ovu ponudu.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {availableDocs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {vaultDocuments.length === 0
                  ? "Nemate dokumenata u Vaultu."
                  : "Svi dokumenti su već priloženi."}
              </p>
            ) : (
              availableDocs.map((doc) => {
                const es = getExpiryStatus(doc.expires_at);
                const bc = getExpiryBadgeClasses(es);
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleAttach(doc.id)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <FileText className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      {doc.type && (
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${bc}`}>
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
