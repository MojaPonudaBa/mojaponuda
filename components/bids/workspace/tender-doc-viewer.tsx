"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TenderDocViewerProps {
  fileUrl: string;
  fileName: string;
  pageNumber: number;
  highlightText?: string;
  onClose: () => void;
  onPageChange: (page: number) => void;
}

/**
 * Highlight the source text in the PDF text layer.
 * Strategy: build concatenated page text from all spans, find the best
 * matching substring, then map character positions back to spans.
 */
function highlightMatches(container: HTMLElement, sourceText: string) {
  const textLayer = container.querySelector(".react-pdf__Page__textContent");
  if (!textLayer) return;

  // Remove previous highlights
  textLayer.querySelectorAll(".td-highlight").forEach((el) => el.classList.remove("td-highlight"));

  if (!sourceText) return;

  const spans = Array.from(textLayer.querySelectorAll("span"));
  if (spans.length === 0) return;

  // Build a map: for each character in the concatenated text, which span owns it
  const spanRanges: Array<{ span: HTMLElement; start: number; end: number }> = [];
  let fullPageText = "";

  for (const span of spans) {
    const text = span.textContent ?? "";
    if (!text) continue;
    const start = fullPageText.length;
    fullPageText += text;
    spanRanges.push({ span: span as HTMLElement, start, end: fullPageText.length });
  }

  const pageTextLower = fullPageText.toLowerCase();
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedSource = normalize(sourceText);

  // Try progressively shorter substrings of the source text to find a match
  // Start with the first 80 chars, then 60, 40, 25
  let matchStart = -1;
  let matchEnd = -1;

  for (const len of [80, 60, 40, 25]) {
    if (normalizedSource.length < len) continue;
    const searchPhrase = normalizedSource.slice(0, len);
    const idx = pageTextLower.indexOf(searchPhrase);
    if (idx >= 0) {
      matchStart = idx;
      matchEnd = idx + searchPhrase.length;
      break;
    }
  }

  // Fallback: try to find the whole normalized source (for short texts)
  if (matchStart < 0 && normalizedSource.length >= 10) {
    const idx = pageTextLower.indexOf(normalizedSource.slice(0, Math.min(normalizedSource.length, 120)));
    if (idx >= 0) {
      matchStart = idx;
      matchEnd = idx + Math.min(normalizedSource.length, 120);
    }
  }

  if (matchStart < 0) return;

  // Map character range back to spans
  let firstHighlighted: HTMLElement | null = null;
  for (const { span, start, end } of spanRanges) {
    if (end > matchStart && start < matchEnd) {
      span.classList.add("td-highlight");
      if (!firstHighlighted) firstHighlighted = span;
    }
  }

  if (firstHighlighted) {
    firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function TenderDocViewer({
  fileUrl,
  fileName,
  pageNumber,
  highlightText,
  onClose,
  onPageChange,
}: TenderDocViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Highlight matching text after page render
  useEffect(() => {
    if (!highlightText || !containerRef.current) return;
    const timer = setTimeout(() => {
      if (containerRef.current) highlightMatches(containerRef.current, highlightText);
    }, 600);
    return () => clearTimeout(timer);
  }, [highlightText, pageNumber]);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoading(false);
  }, []);

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(page, numPages));
    onPageChange(clamped);
  }, [numPages, onPageChange]);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Compact toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 bg-slate-50/80">
        <p className="text-xs font-bold text-slate-700 truncate max-w-[140px]" title={fileName}>
          {fileName}
        </p>

        <div className="flex items-center gap-1">
          {/* Page nav */}
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-[11px] font-bold text-slate-600 min-w-[44px] text-center tabular-nums">
            {pageNumber}/{numPages}
          </span>
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= numPages}>
            <ChevronRight className="size-3.5" />
          </Button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Zoom */}
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}>
            <Minus className="size-3" />
          </Button>
          <span className="text-[10px] font-mono text-slate-400 min-w-[32px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}>
            <Plus className="size-3" />
          </Button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <Button variant="ghost" size="icon" className="size-7 text-slate-400 hover:text-slate-700"
            onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Highlight indicator */}
      {highlightText && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 text-[10px] font-medium text-amber-700 truncate">
          🔍 {highlightText.slice(0, 80)}{highlightText.length > 80 ? "…" : ""}
        </div>
      )}

      {/* PDF content */}
      <div ref={containerRef}
        className="flex-1 overflow-auto flex justify-center bg-slate-100/50 p-2">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-xs font-medium">Učitavam…</span>
          </div>
        )}
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
          className="shadow-lg rounded-lg overflow-hidden"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer={true}
            className="bg-white"
          />
        </Document>
      </div>
    </div>
  );
}
