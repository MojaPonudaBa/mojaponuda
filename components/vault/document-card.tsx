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
  
  // Sleek theme badge classes
  const getCustomBadgeClasses = (status: string) => {
    switch (status) {
      case "danger":
        return "text-red-700 bg-red-50 border border-red-200";
      case "warning":
        return "text-amber-700 bg-amber-50 border border-amber-200";
      case "ok":
        return "text-emerald-700 bg-emerald-50 border border-emerald-200";
      default:
        return "text-slate-700 bg-slate-50 border border-slate-200";
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
      <div className="group relative overflow-hidden rounded bg-white shadow-sm border border-slate-200 hover:border-slate-300 transition-colors flex flex-col">
        {/* Top status indicator line */}
        <div
          className={`h-0.5 w-full ${
            expiryStatus === "danger"
              ? "bg-red-600"
              : expiryStatus === "warning"
              ? "bg-amber-500"
              : expiryStatus === "ok"
              ? "bg-emerald-500"
              : "bg-slate-300"
          }`}
        />
        
        <div className="flex flex-col flex-1 p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-slate-100 border border-slate-200">
              <FileText className="size-5 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 leading-snug break-words" title={document.name}>
                {document.name}
              </p>
              {document.type && (
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mt-1" title={document.type}>
                  {document.type}
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div
              className={`inline-flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium ${expiryBadgeClasses}`}
            >
              {expiryStatus === "danger" && (
                <AlertTriangle className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{expiryText}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewLoading}
                className="flex-1 rounded-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-none"
              >
                {previewLoading ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Eye className="mr-1.5 size-3.5" />
                )}
                Pregled
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload} 
                className="flex-1 rounded-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-none"
              >
                <Download className="mr-1.5 size-3.5" />
                Preuzmi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="shrink-0 rounded-sm border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-none px-2.5"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-md border border-slate-200 shadow-lg sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold text-slate-900">Brisanje dokumenta</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-2">
              Da li ste sigurni da želite obrisati dokument{" "}
              <strong className="text-slate-900 font-medium">{document.name}</strong>? Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-sm border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Odustani
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-sm bg-red-600 hover:bg-red-700"
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
