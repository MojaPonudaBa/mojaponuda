"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { FileText, Plus, X, AlertTriangle, Paperclip, Loader2 } from "lucide-react";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [localAttachedDocs, setLocalAttachedDocs] = useState(attachedDocs);
  const [localVaultDocuments, setLocalVaultDocuments] = useState(vaultDocuments);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalAttachedDocs(attachedDocs);
  }, [attachedDocs]);

  useEffect(() => {
    setLocalVaultDocuments(vaultDocuments);
  }, [vaultDocuments]);

  const availableDocs = useMemo(() => {
    const attachedIds = new Set(localAttachedDocs.map((item) => item.document.id));
    return localVaultDocuments.filter((document) => !attachedIds.has(document.id));
  }, [localAttachedDocs, localVaultDocuments]);

  async function handleAttach(documentId: string) {
    const document = localVaultDocuments.find((entry) => entry.id === documentId);
    if (!document) return;

    const optimisticId = `local-${documentId}`;
    setLocalAttachedDocs((current) => [{ id: optimisticId, document }, ...current]);
    setAddOpen(false);

    try {
      const response = await fetch(`/api/bids/${bidId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });

      if (response.status === 409) {
        setLocalAttachedDocs((current) => current.filter((item) => item.id !== optimisticId));
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Nismo uspjeli priložiti dokument.");
      }

      startTransition(() => {
        setLocalAttachedDocs((current) =>
          current.map((item) =>
            item.id === optimisticId
              ? { id: data?.bidDoc?.id ?? documentId, document }
              : item
          )
        );
      });
    } catch (error) {
      setLocalAttachedDocs((current) => current.filter((item) => item.id !== optimisticId));
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nismo uspjeli priložiti dokument.",
        variant: "destructive",
      });
    }
  }

  async function handleRemove(bidDocId: string) {
    const previousDocs = localAttachedDocs;
    setRemovingId(bidDocId);
    setLocalAttachedDocs((current) => current.filter((item) => item.id !== bidDocId));

    try {
      const response = await fetch(`/api/bids/${bidId}/documents/${bidDocId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Nismo uspjeli ukloniti dokument.");
      }
    } catch (error) {
      setLocalAttachedDocs(previousDocs);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nismo uspjeli ukloniti dokument.",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 rounded-[1.6rem] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_55px_-38px_rgba(15,23,42,0.18)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-slate-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Paperclip className="size-5" />
          </div>
          <h3 className="font-heading text-lg font-bold">Dokumenti</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="rounded-xl border border-slate-200 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Plus className="mr-2 size-3.5" />
          Dodaj
        </Button>
      </div>

      <div className="flex-1 space-y-3">
        {localAttachedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
            <Paperclip className="mb-2 size-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-900">Nema priloženih dokumenata</p>
            <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
              Ovdje se pojavljuju dokumenti koje ste priložili za ovu pripremu, a nisu vezani za jednu stavku sa liste.
            </p>
          </div>
        ) : (
          localAttachedDocs.map((attached) => {
            const expiryStatus = getExpiryStatus(attached.document.expires_at);
            const badgeClasses = getExpiryBadgeClasses(expiryStatus);
            const expiryText = formatExpiryText(attached.document.expires_at);

            return (
              <div
                key={attached.id}
                className="group relative flex items-center gap-3 rounded-[1.1rem] border border-slate-200 bg-white p-3 transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{attached.document.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {attached.document.type ? (
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        {attached.document.type}
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badgeClasses}`}
                    >
                      {expiryStatus === "danger" ? <AlertTriangle className="size-2.5" /> : null}
                      {expiryText}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 rounded-lg text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  onClick={() => void handleRemove(attached.id)}
                  disabled={removingId === attached.id}
                >
                  {removingId === attached.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                </Button>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl border-slate-100 bg-white p-6 shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-slate-900">
              Dodaj dokument
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Odaberite postojeći dokument ili učitajte novi.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 flex gap-2">
            <AddDocumentModal
              refreshOnSuccess={false}
              onSuccess={(document) => {
                setLocalVaultDocuments((current) =>
                  current.some((entry) => entry.id === document.id) ? current : [document, ...current]
                );
                void handleAttach(document.id);
              }}
              trigger={
                <Button className="w-full rounded-xl border border-indigo-200 bg-indigo-50 font-bold text-indigo-700 shadow-sm hover:bg-indigo-100">
                  <Plus className="mr-2 size-4" />
                  Novi dokument
                </Button>
              }
            />
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 font-bold tracking-wider text-slate-500">
                Ili odaberite iz trezora
              </span>
            </div>
          </div>

          <div className="custom-scrollbar max-h-80 space-y-2 overflow-y-auto pr-2">
            {availableDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <FileText className="mb-2 size-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-900">
                  {localVaultDocuments.length === 0 ? "Trezor je prazan" : "Sve je već priloženo"}
                </p>
              </div>
            ) : (
              availableDocs.map((document) => {
                const expiryStatus = getExpiryStatus(document.expires_at);
                const badgeClasses = getExpiryBadgeClasses(expiryStatus);
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => void handleAttach(document.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                    disabled={isPending}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 group-hover:text-indigo-900">
                        {document.name}
                      </p>
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
