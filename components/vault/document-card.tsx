"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Document } from "@/types/database";
import {
  getExpiryStatus,
  getExpiryBadgeClasses,
  formatExpiryText,
} from "@/lib/vault/constants";
import { Card, CardContent } from "@/components/ui/card";
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
  const expiryBadgeClasses = getExpiryBadgeClasses(expiryStatus);
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
      <Card className="group relative overflow-hidden border-border bg-card transition-all hover:border-primary/20">
        {/* Colored left border stripe based on expiry status */}
        <div
          className={`absolute inset-y-0 left-0 w-1 ${
            expiryStatus === "danger"
              ? "bg-red-500"
              : expiryStatus === "warning"
              ? "bg-amber-500"
              : expiryStatus === "ok"
              ? "bg-emerald-500"
              : "bg-muted-foreground/20"
          }`}
        />
        <CardContent className="flex flex-col gap-3 p-4 pl-5">
          {/* Ikona i naziv */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {document.name}
              </p>
              {document.type && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {document.type}
                </p>
              )}
            </div>
          </div>

          {/* Status isteka */}
          <div
            className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] font-semibold ${expiryBadgeClasses}`}
          >
            {expiryStatus === "danger" && (
              <AlertTriangle className="size-3" />
            )}
            {expiryText}
          </div>

          {/* Akcije */}
          <div className="flex gap-1.5 border-t border-border pt-3">
            <Button
              variant="outline"
              size="xs"
              onClick={handlePreview}
              disabled={previewLoading}
              className="h-7 text-[11px]"
            >
              {previewLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Eye className="size-3" />
              )}
              Pregled
            </Button>
            <Button variant="outline" size="xs" onClick={handleDownload} className="h-7 text-[11px]">
              <Download className="size-3" />
              Preuzmi
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() => setDeleteOpen(true)}
              className="ml-auto h-7 text-[11px]"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog za potvrdu brisanja */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Brisanje dokumenta</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite obrisati dokument{" "}
              <strong>{document.name}</strong>? Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Odustani
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="animate-spin" />}
              Obriši
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
