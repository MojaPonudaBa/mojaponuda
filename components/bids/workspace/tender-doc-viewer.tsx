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
  Maximize2,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TenderDocViewerProps {
  fileUrl: string;
  fileName: string;
  pageNumber: number;
  highlightText?: string;
  onClose: () => void;
  onPageChange: (page: number) => void;
  onOpenFull?: () => void;
}

function highlightMatches(container: HTMLElement, sourceText: string) {
  const textLayer = container.querySelector(".react-pdf__Page__textContent");
  if (!textLayer) return;

  textLayer.querySelectorAll(".td-highlight").forEach((element) => element.classList.remove("td-highlight"));

  if (!sourceText) return;

  const spans = Array.from(textLayer.querySelectorAll("span"));
  if (spans.length === 0) return;

  const spanRanges: Array<{ span: HTMLElement; start: number; end: number }> = [];
  let fullPageText = "";

  for (const span of spans) {
    const text = span.textContent ?? "";
    if (!text) continue;
    const start = fullPageText.length;
    fullPageText += text;
    spanRanges.push({ span: span as HTMLElement, start, end: fullPageText.length });
  }

  const normalizedPageText = fullPageText.toLowerCase();
  const normalizedSource = sourceText.toLowerCase().replace(/\s+/g, " ").trim();

  let matchStart = -1;
  let matchEnd = -1;

  for (const length of [80, 60, 40, 25]) {
    if (normalizedSource.length < length) continue;
    const phrase = normalizedSource.slice(0, length);
    const foundAt = normalizedPageText.indexOf(phrase);
    if (foundAt >= 0) {
      matchStart = foundAt;
      matchEnd = foundAt + phrase.length;
      break;
    }
  }

  if (matchStart < 0 && normalizedSource.length >= 10) {
    const phrase = normalizedSource.slice(0, Math.min(normalizedSource.length, 120));
    const foundAt = normalizedPageText.indexOf(phrase);
    if (foundAt >= 0) {
      matchStart = foundAt;
      matchEnd = foundAt + phrase.length;
    }
  }

  if (matchStart < 0) return;

  let firstHighlighted: HTMLElement | null = null;
  for (const { span, start, end } of spanRanges) {
    if (end > matchStart && start < matchEnd) {
      span.classList.add("td-highlight");
      if (!firstHighlighted) firstHighlighted = span;
    }
  }

  firstHighlighted?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function TenderDocViewer({
  fileUrl,
  fileName,
  pageNumber,
  highlightText,
  onClose,
  onPageChange,
  onOpenFull,
}: TenderDocViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(0.72);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightText || !containerRef.current) return;
    const timer = setTimeout(() => {
      if (containerRef.current) {
        highlightMatches(containerRef.current, highlightText);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [highlightText, pageNumber]);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoading(false);
  }, []);

  const goToPage = useCallback(
    (nextPage: number) => {
      const clamped = Math.max(1, Math.min(nextPage, numPages));
      onPageChange(clamped);
    },
    [numPages, onPageChange],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_22px_55px_-38px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
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
              onClick={() => setScale((current) => Math.max(current - 0.1, 0.45))}
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-[54px] text-center text-xs font-semibold text-slate-600">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-slate-700"
              onClick={() => setScale((current) => Math.min(current + 0.1, 2))}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {onOpenFull ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl border border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:bg-slate-100"
              onClick={onOpenFull}
            >
              <Maximize2 className="mr-2 size-4" />
              Otvori puni pregled
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {highlightText ? (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          Traženi dio je označen na ovoj stranici.
        </div>
      ) : null}

      <div ref={containerRef} className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100/80 p-4">
        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white bg-white px-5 py-4 text-slate-600 shadow-sm">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm font-medium">Učitavam dokument...</span>
          </div>
        ) : null}
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
          className="overflow-hidden rounded-[1.35rem] shadow-[0_22px_50px_-34px_rgba(15,23,42,0.24)]"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer
            className="bg-white"
          />
        </Document>
      </div>
    </div>
  );
}
