"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Minus,
  Plus,
  FileText,
} from "lucide-react";
import type { BidChecklistItem } from "@/types/database";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TenderDocFullViewerProps {
  fileUrl: string;
  fileName: string;
  checklistItems: BidChecklistItem[];
  onClose: () => void;
}

export function TenderDocFullViewer({
  fileUrl,
  fileName,
  checklistItems,
  onClose,
}: TenderDocFullViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const pageElementRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Collect all checklist items that have page references
  const pageRefs = checklistItems
    .filter((item) => item.page_number && item.page_number > 0)
    .sort((a, b) => (a.page_number ?? 0) - (b.page_number ?? 0));

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoading(false);
  }, []);

  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, numPages));
    setPageNumber(targetPage);
    
    // Scroll to the target page
    const pageElement = pageElementRefs.current.get(targetPage);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [numPages]);

  // Items on the current page
  const currentPageItems = pageRefs.filter((item) => item.page_number === pageNumber);

  // Unique pages that have references
  const referencedPages = [...new Set(pageRefs.map((item) => item.page_number!))].sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm">
      {/* Left sidebar: page reference list */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Zahtjevi po stranicama</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {pageRefs.length} stavki sa referencama
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {referencedPages.length === 0 ? (
            <p className="p-4 text-xs text-slate-400 italic">
              Nema stavki sa referencama na stranice.
            </p>
          ) : (
            referencedPages.map((pg) => {
              const items = pageRefs.filter((item) => item.page_number === pg);
              return (
                <div key={pg} className="border-b border-slate-100">
                  <button
                    onClick={() => goToPage(pg)}
                    className={`w-full text-left px-4 py-2 text-[11px] font-bold transition-colors ${
                      pg === pageNumber
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Stranica {pg}
                  </button>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => goToPage(item.page_number!)}
                      className={`w-full text-left px-4 py-2 pl-6 flex items-start gap-2 transition-colors ${
                        item.page_number === pageNumber
                          ? "bg-blue-50/50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="size-3 mt-0.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-700 leading-tight truncate">
                          {item.title}
                        </p>
                        {item.page_reference && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {item.page_reference}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main PDF area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="size-4 text-slate-400 shrink-0" />
            <span className="text-sm font-bold text-slate-900 truncate">{fileName}</span>
            {currentPageItems.length > 0 && (
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {currentPageItems.length} zahtjev{currentPageItems.length > 1 ? "a" : ""} na ovoj stranici
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Page navigation */}
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 px-1">
              <Button variant="ghost" size="icon" className="size-8"
                onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-bold text-slate-700 min-w-[64px] text-center tabular-nums">
                {pageNumber} / {numPages}
              </span>
              <Button variant="ghost" size="icon" className="size-8"
                onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= numPages}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 px-1">
              <Button variant="ghost" size="icon" className="size-8"
                onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}>
                <Minus className="size-4" />
              </Button>
              <span className="text-xs font-mono text-slate-500 min-w-[36px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="size-8"
                onClick={() => setScale((s) => Math.min(3, s + 0.15))}>
                <Plus className="size-4" />
              </Button>
            </div>

            <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-slate-900"
              onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Badges for current page items */}
        {currentPageItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-blue-50/80 border-b border-blue-100">
            {currentPageItems.map((item) => (
              <span key={item.id}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-blue-700 border border-blue-200 shadow-sm">
                <FileText className="size-3" />
                {item.title.length > 40 ? item.title.slice(0, 40) + "…" : item.title}
              </span>
            ))}
          </div>
        )}

        {/* PDF content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto flex justify-center bg-slate-100 p-4"
        >
          {loading && (
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm font-medium">Učitavam dokument...</span>
            </div>
          )}
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            className="shadow-2xl rounded-lg overflow-hidden"
          >
            <div className="flex flex-col gap-4">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <div
                  key={page}
                  ref={(el) => {
                    if (el) {
                      pageElementRefs.current.set(page, el);
                    } else {
                      pageElementRefs.current.delete(page);
                    }
                  }}
                >
                  <Page
                    pageNumber={page}
                    scale={scale}
                    renderAnnotationLayer={false}
                    renderTextLayer={true}
                    className="bg-white"
                  />
                </div>
              ))}
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}
