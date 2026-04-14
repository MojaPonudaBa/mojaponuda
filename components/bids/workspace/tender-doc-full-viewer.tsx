"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import type { BidChecklistItem } from "@/types/database";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TenderDocFullViewerProps {
  fileUrl: string;
  fileName: string;
  checklistItems: BidChecklistItem[];
  initialPage?: number;
  onClose: () => void;
}

export function TenderDocFullViewer({
  fileUrl,
  fileName,
  checklistItems,
  initialPage = 1,
  onClose,
}: TenderDocFullViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setPageNumber(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (!viewportRef.current || !pageSize) return;

    const viewport = viewportRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const widthScale = Math.max((entry.contentRect.width - 48) / pageSize.width, 0.45);
      const heightScale = Math.max((entry.contentRect.height - 48) / pageSize.height, 0.45);
      setFitScale(Math.min(widthScale, heightScale, 1.15));
    });

    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [pageSize]);

  const pageRefs = useMemo(
    () =>
      checklistItems
        .filter((item) => item.page_number && item.page_number > 0)
        .sort((left, right) => (left.page_number ?? 0) - (right.page_number ?? 0)),
    [checklistItems],
  );

  const referencedPages = useMemo(
    () => [...new Set(pageRefs.map((item) => item.page_number!))].sort((left, right) => left - right),
    [pageRefs],
  );

  const currentPageItems = useMemo(
    () => pageRefs.filter((item) => item.page_number === pageNumber),
    [pageNumber, pageRefs],
  );

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setLoading(false);
      setPageNumber((current) => Math.max(1, Math.min(current, total)));
    },
    [],
  );

  const currentScale = manualScale ?? fitScale;

  function goToPage(nextPage: number) {
    setPageNumber(Math.max(1, Math.min(nextPage, numPages)));
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/80 backdrop-blur-sm">
      <aside className="hidden w-[320px] shrink-0 border-r border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Brzi pregled
          </p>
          <h3 className="mt-2 font-heading text-xl font-bold text-white">Zahtjevi po stranicama</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Kliknite na stranicu ili zahtjev i dokument se otvara tačno tamo gdje treba.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {referencedPages.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Još nema stavki sa vezanom stranicom iz dokumentacije.
            </div>
          ) : (
            <div className="space-y-2">
              {referencedPages.map((page) => {
                const items = pageRefs.filter((item) => item.page_number === page);
                return (
                  <div key={page} className="rounded-2xl border border-white/10 bg-white/5 p-2">
                    <button
                      type="button"
                      onClick={() => goToPage(page)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        page === pageNumber
                          ? "bg-blue-500 text-white"
                          : "text-slate-200 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>Stranica {page}</span>
                      <span className="text-xs opacity-80">{items.length}</span>
                    </button>
                    <div className="mt-2 space-y-1">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                            page === pageNumber ? "bg-blue-500/10" : "hover:bg-white/8"
                          }`}
                        >
                          <FileText className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-xs font-medium text-slate-100">{item.title}</p>
                            {item.page_reference ? (
                              <p className="mt-1 text-[11px] text-slate-400">{item.page_reference}</p>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/95 px-4 py-3 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900" title={fileName}>
              {fileName}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Stranica {pageNumber} od {numPages || 1}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-1 py-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl px-3 text-slate-700"
                onClick={() => goToPage(pageNumber - 1)}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="mr-1 size-4" />
                Nazad
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl px-3 text-slate-700"
                onClick={() => goToPage(pageNumber + 1)}
                disabled={pageNumber >= numPages}
              >
                Naprijed
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-1 py-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl text-slate-700"
                onClick={() => setManualScale((current) => Math.max((current ?? currentScale) - 0.1, 0.45))}
              >
                <Minus className="size-4" />
              </Button>
              <button
                type="button"
                onClick={() => setManualScale(null)}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Cijela stranica {Math.round(currentScale * 100)}%
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl text-slate-700"
                onClick={() => setManualScale((current) => Math.min((current ?? currentScale) + 0.1, 2))}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {currentPageItems.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-white/10 bg-blue-50 px-4 py-2">
            {currentPageItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700"
              >
                <FileText className="size-3.5" />
                {item.title}
              </span>
            ))}
          </div>
        ) : null}

        <div ref={viewportRef} className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100/90 p-6">
          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white px-5 py-4 text-slate-600 shadow-sm">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm font-medium">Učitavam dokument...</span>
            </div>
          ) : null}

          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
            <Page
              pageNumber={pageNumber}
              scale={currentScale}
              renderAnnotationLayer={false}
              renderTextLayer
              className="overflow-hidden rounded-[1.4rem] bg-white shadow-[0_28px_65px_-38px_rgba(15,23,42,0.32)]"
              onLoadSuccess={(page) => {
                const viewport = page.getViewport({ scale: 1 });
                setPageSize({ width: viewport.width, height: viewport.height });
              }}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
