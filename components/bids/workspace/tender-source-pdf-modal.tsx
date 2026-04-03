"use client";

import { useEffect, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Serve worker from /public to avoid bundler/runtime issues in production.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export type HighlightRegion = { x: number; y: number; width: number; height: number };

interface TenderSourcePdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidId: string;
  sourceDocumentId: string;
  title: string;
  initialPage: number;
  regions: HighlightRegion[] | null;
}

export function TenderSourcePdfModal({
  open,
  onOpenChange,
  bidId,
  sourceDocumentId,
  title,
  initialPage,
  regions,
}: TenderSourcePdfModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState<number>(720);

  const safePage = initialPage >= 1 ? initialPage : 1;

  useEffect(() => {
    if (!open) {
      setPdfUrl(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bids/${bidId}/tender-source/${sourceDocumentId}/preview`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Pregled nije dostupan.");
        }
        if (!cancelled) {
          setPdfUrl(data.url as string);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Greška pri učitavanju.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, bidId, sourceDocumentId]);

  const onDocLoad = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
    },
    []
  );

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const w = Math.min(window.innerWidth - 80, 900);
    setPageWidth(w);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-slate-100 bg-white p-0 sm:max-w-[min(940px,calc(100vw-2rem))]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-heading text-lg font-bold text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Stranica {Math.min(safePage, numPages || safePage)} u tenderskoj dokumentaciji
            {regions?.length ? " · istaknut je traženi odlomak" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4">
          {loadError && (
            <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
          )}
          {!pdfUrl && !loadError && (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="size-5 animate-spin" />
              Učitavam dokument…
            </div>
          )}
          {pdfUrl && (
            <div className="mx-auto w-full max-w-[900px]">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocLoad}
                loading={
                  <div className="flex justify-center py-12 text-slate-500">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                }
                error={
                  <p className="text-center text-sm text-red-600">
                    PDF se ne može prikazati. Pokušajte preuzeti izvorni fajl s portala.
                  </p>
                }
              >
                <div className="relative inline-block w-full shadow-sm">
                  <Page
                    pageNumber={Math.min(safePage, numPages || safePage)}
                    width={pageWidth}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                  {regions?.map((r, i) => (
                    <div
                      key={i}
                      className="pointer-events-none absolute z-10 rounded-sm bg-amber-300/45 mix-blend-multiply ring-1 ring-amber-500/40"
                      style={{
                        left: `${r.x * 100}%`,
                        top: `${r.y * 100}%`,
                        width: `${r.width * 100}%`,
                        height: `${r.height * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </Document>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
