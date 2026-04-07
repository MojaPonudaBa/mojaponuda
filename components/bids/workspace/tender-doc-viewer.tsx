"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  FileText,
  Loader2,
  Search,
} from "lucide-react";

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TenderDocViewerProps {
  fileUrl: string;
  fileName: string;
  initialPage?: number;
  highlightText?: string;
  onClose: () => void;
}

export function TenderDocViewer({
  fileUrl,
  fileName,
  initialPage = 1,
  highlightText,
  onClose,
}: TenderDocViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchActive, setSearchActive] = useState(false);

  // Navigate to page when initialPage changes (from checklist click)
  useEffect(() => {
    if (initialPage > 0) {
      setPageNumber(initialPage);
    }
  }, [initialPage]);

  // Highlight matching text on the page after render
  useEffect(() => {
    if (!highlightText || !containerRef.current) return;

    // Wait for text layer to render
    const timer = setTimeout(() => {
      const textLayer = containerRef.current?.querySelector(".react-pdf__Page__textContent");
      if (!textLayer) return;

      // Remove previous highlights
      textLayer.querySelectorAll(".td-highlight").forEach((el) => el.classList.remove("td-highlight"));

      const spans = textLayer.querySelectorAll("span");
      const searchLower = highlightText.toLowerCase().slice(0, 60);

      spans.forEach((span) => {
        if (span.textContent && span.textContent.toLowerCase().includes(searchLower)) {
          span.classList.add("td-highlight");
          span.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [highlightText, pageNumber]);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoading(false);
  }, []);

  const goToPage = useCallback((page: number) => {
    setPageNumber(Math.max(1, Math.min(page, numPages)));
  }, [numPages]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="size-4 text-slate-400 shrink-0" />
          <span className="text-sm font-bold text-slate-900 truncate">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 px-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-bold text-slate-700 min-w-[80px] text-center">
              {pageNumber} / {numPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 px-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            >
              <ZoomOut className="size-4" />
            </Button>
            <span className="text-xs font-bold text-slate-500 min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            >
              <ZoomIn className="size-4" />
            </Button>
          </div>

          {/* Highlight indicator */}
          {highlightText && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 rounded-lg border border-amber-200 px-2 py-1">
              <Search className="size-3 text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 max-w-[150px] truncate">
                {highlightText.slice(0, 40)}...
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
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
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer={true}
            renderTextLayer={true}
            className="bg-white"
          />
        </Document>
      </div>
    </div>
  );
}
