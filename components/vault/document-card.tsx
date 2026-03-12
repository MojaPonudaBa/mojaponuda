"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Document } from "@/types/database";
import {
  getExpiryStatus,
  getExpiryBadgeClasses,
  formatExpiryText,
} from "@/lib/vault/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const expiryStatus = getExpiryStatus(document.expires_at);
  
  // Custom classes for the new light theme
  const getCustomBadgeClasses = (status: string) => {
    switch (status) {
      case "danger":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "ok":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };
  
  const expiryBadgeClasses = getCustomBadgeClasses(expiryStatus);
  const expiryText = formatExpiryText(document.expires_at);

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/documents/signed-url/${document.id}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const res = await fetch(`/api/documents/signed-url/${document.id}`);
      const data = await res.json();
      if (data.url) {
        const link = window.document.createElement("a");
        link.href = data.url;
        link.download = document.name;
        link.click();
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
        {/* Colored top border stripe based on expiry status */}
        <div
          className={`absolute inset-x-0 top-0 h-1 ${
            expiryStatus === "danger"
              ? "bg-red-500 animate-pulse"
              : expiryStatus === "warning"
              ? "bg-amber-500"
              : expiryStatus === "ok"
              ? "bg-emerald-500"
              : "bg-slate-300"
          }`}
        />
        
        <div className="flex flex-col h-full p-6 pt-7">
          {/* Ikona i naziv */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-slate-900 mb-1" title={document.name}>
                {document.name}
              </p>
              {document.type && (
                <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500" title={document.type}>
                  {document.type}
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-5">
            {/* Status isteka */}
            <div
              className={`inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${expiryBadgeClasses}`}
            >
              {expiryStatus === "danger" && (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span className="truncate">{expiryText}</span>
            </div>

            {/* Akcije */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewLoading}
                className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-primary hover:border-blue-200"
              >
                {previewLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 size-4" />
                )}
                Pregled
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload} 
                className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-primary hover:border-blue-200"
              >
                <Download className="mr-2 size-4" />
                Preuzmi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="shrink-0 rounded-xl border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog za potvrdu brisanja */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl border-none shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-slate-900">Brisanje dokumenta</DialogTitle>
            <DialogDescription className="text-base text-slate-600 mt-2">
              Da li ste sigurni da želite obrisati dokument{" "}
              <strong className="text-slate-900">{document.name}</strong>? Ova akcija se ne može poništiti i dokument će biti uklonjen iz svih povezanih ponuda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Odustani
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Obriši dokument
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
