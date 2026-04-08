"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Document } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  formatExpiryText,
  getExpiryStatus,
} from "@/lib/vault/constants";
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentCardProps {
  document: Document;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "danger":
      return {
        accent: "bg-rose-500",
        badge: "border-rose-500/25 bg-rose-500/10 text-rose-100",
      };
    case "warning":
      return {
        accent: "bg-amber-400",
        badge: "border-amber-500/25 bg-amber-500/10 text-amber-100",
      };
    case "ok":
      return {
        accent: "bg-emerald-400",
        badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
      };
    default:
      return {
        accent: "bg-slate-500",
        badge: "border-white/10 bg-white/5 text-slate-200",
      };
  }
}

export function DocumentCard({ document }: DocumentCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const expiryStatus = getExpiryStatus(document.expires_at);
  const expiryText = formatExpiryText(document.expires_at);
  const statusClasses = getStatusClasses(expiryStatus);

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/documents/signed-url/${document.id}`);
      const data = await response.json();
      if (data.url) window.open(data.url, "_blank");
    } catch (error) {
      console.error("Preview error:", error);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const response = await fetch(`/api/documents/signed-url/${document.id}`);
      const data = await response.json();
      if (data.url) {
        const link = window.document.createElement("a");
        link.href = data.url;
        link.download = document.name;
        link.click();
      }
    } catch (error) {
      console.error("Download error:", error);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <article className="relative overflow-hidden rounded-[1.4rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5 text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]">
        <div className={`absolute inset-x-0 top-0 h-1 ${statusClasses.accent}`} />
        <div className="flex min-h-full flex-col">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-base font-semibold leading-6 text-white" title={document.name}>
                {document.name}
              </h3>
              {document.type ? (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {document.type}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex-1 space-y-4">
            <div className={`inline-flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium ${statusClasses.badge}`}>
              {expiryStatus === "danger" ? <AlertTriangle className="size-4 shrink-0" /> : null}
              <span className="truncate">{expiryText}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={previewLoading}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                {previewLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Eye className="mr-2 size-4" />}
                Pregled
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Download className="mr-2 size-4" />
                Preuzmi
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="h-11 w-full rounded-2xl border-rose-500/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 hover:text-rose-50"
            >
              <Trash2 className="mr-2 size-4" />
              Obriši dokument
            </Button>
          </div>
        </div>
      </article>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl border-slate-800 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-white">Brisanje dokumenta</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-400">
              Da li ste sigurni da želite obrisati dokument <strong className="text-white">{document.name}</strong>? Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Odustani
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="h-11 rounded-2xl border-rose-500/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 hover:text-rose-50"
            >
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Obriši dokument
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
