"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  Sparkles,
  FileSearch,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

type UploadStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "analyzing"
  | "ready"
  | "error";

interface TenderDocUploadProps {
  bidId: string;
  existingUpload?: {
    id: string;
    file_name: string;
    status: string;
    page_count: number | null;
    ai_analysis: unknown;
    error_message: string | null;
  } | null;
}

const STATUS_TEXT: Record<UploadStatus, string> = {
  idle: "",
  uploading: "Uploadam dokument...",
  extracting: "Čitam i izvlačim tekst iz dokumenta...",
  analyzing: "Analiziram zahtjeve iz dokumentacije...",
  ready: "Analiza završena",
  error: "Greška pri analizi",
};

const STATUS_SUBSTEP: Record<UploadStatus, string> = {
  idle: "",
  uploading: "Priprema fajla za analizu",
  extracting: "Prepoznavanje teksta stranica",
  analyzing: "Identifikacija tražene dokumentacije, rokova i uslova",
  ready: "Lista zahtjeva je generisana iz vaše tenderske dokumentacije",
  error: "",
};

export function TenderDocUpload({ bidId, existingUpload }: TenderDocUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>(
    existingUpload?.status === "ready" ? "ready" : "idle",
  );
  const [error, setError] = useState<string | null>(
    existingUpload?.error_message || null,
  );
  const [fileName, setFileName] = useState<string>(
    existingUpload?.file_name || "",
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [checklistCount, setChecklistCount] = useState<number | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);

      // Validate
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      const validExtensions = [".pdf", ".doc", ".docx"];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

      if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
        setError("Podržani formati su PDF i DOCX.");
        setStatus("error");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setError("Fajl ne smije biti veći od 50 MB.");
        setStatus("error");
        return;
      }

      setStatus("uploading");

      const formData = new FormData();
      formData.append("file", file);

      // Simulate step progression for UX (actual processing is server-side)
      const stepTimer = setTimeout(() => setStatus("extracting"), 2000);
      const stepTimer2 = setTimeout(() => setStatus("analyzing"), 5000);

      try {
        const res = await fetch(`/api/bids/${bidId}/tender-documentation`, {
          method: "POST",
          body: formData,
        });

        clearTimeout(stepTimer);
        clearTimeout(stepTimer2);

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Greška pri analizi dokumenta.");
          setStatus("error");
          return;
        }

        setStatus("ready");
        setChecklistCount(data.checklist_items_count);
        router.refresh();
      } catch {
        clearTimeout(stepTimer);
        clearTimeout(stepTimer2);
        setError("Greška pri komunikaciji sa serverom.");
        setStatus("error");
      }
    },
    [bidId, router],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setError(null);
    setFileName("");
    setChecklistCount(null);
  }, []);

  // Already analyzed – show compact indicator
  if (status === "ready" && existingUpload?.status === "ready") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
          <CheckCircle2 className="size-4 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-800">
            Dokumentacija analizirana
          </p>
          <p className="text-xs text-emerald-600 truncate">
            {existingUpload.file_name}
            {existingUpload.page_count
              ? ` · ${existingUpload.page_count} str.`
              : ""}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 rounded-lg font-bold"
          onClick={handleRetry}
        >
          <RotateCcw className="mr-1.5 size-3" />
          Zamijeni
        </Button>
      </div>
    );
  }

  // Processing state – show progress
  if (["uploading", "extracting", "analyzing"].includes(status)) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-6">
        <div className="flex items-start gap-4">
          <div className="relative flex size-12 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-blue-100 animate-pulse" />
            <Loader2 className="relative size-6 text-blue-600 animate-spin" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-bold text-slate-900">
              {STATUS_TEXT[status]}
            </p>
            <p className="text-xs text-slate-500">{STATUS_SUBSTEP[status]}</p>

            {/* Progress steps */}
            <div className="flex items-center gap-2 pt-2">
              {(["uploading", "extracting", "analyzing"] as const).map(
                (step, i) => {
                  const stepOrder = { uploading: 0, extracting: 1, analyzing: 2 };
                  const currentOrder =
                    stepOrder[status as keyof typeof stepOrder] ?? -1;
                  const isComplete = stepOrder[step] < currentOrder;
                  const isCurrent = stepOrder[step] === currentOrder;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      {i > 0 && (
                        <div
                          className={`h-px w-6 transition-colors duration-500 ${
                            isComplete ? "bg-blue-400" : "bg-slate-200"
                          }`}
                        />
                      )}
                      <div
                        className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-500 ${
                          isComplete
                            ? "bg-blue-500 text-white scale-90"
                            : isCurrent
                            ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300 ring-offset-1"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          i + 1
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {fileName && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-xs text-slate-500 border border-white/80">
            <FileText className="size-3.5 text-slate-400" />
            <span className="truncate font-medium">{fileName}</span>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <AlertCircle className="size-5 text-red-500" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-bold text-red-800">
              Greška pri analizi dokumenta
            </p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button
            size="sm"
            onClick={handleRetry}
            className="h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
          >
            <RotateCcw className="mr-2 size-3.5" />
            Pokušaj ponovo
          </Button>
        </div>
      </div>
    );
  }

  // Success state (just finished)
  if (status === "ready") {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-green-50/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle2 className="size-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-900">
              Dokumentacija analizirana uspješno
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              {checklistCount
                ? `Identificirano ${checklistCount} zahtjeva iz vaše tenderske dokumentacije.`
                : "Lista zahtjeva je generisana iz vaše dokumentacije."}
            </p>
            {fileName && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-xs text-emerald-700 border border-emerald-100">
                <FileText className="size-3.5" />
                <span className="truncate font-medium">{fileName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg"
            onClick={handleRetry}
          >
            <RotateCcw className="mr-1.5 size-3" />
            Uploadaj drugu dokumentaciju
          </Button>
        </div>
      </div>
    );
  }

  // Default idle state – upload prompt
  return (
    <div
      className={`group rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragOver
          ? "border-blue-400 bg-blue-50/70 scale-[1.01] shadow-lg shadow-blue-100"
          : "border-slate-200 bg-gradient-to-br from-slate-50/80 to-blue-50/30 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileInput}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full p-6 text-left cursor-pointer"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
              isDragOver
                ? "bg-blue-200 text-blue-700 scale-110"
                : "bg-blue-100/80 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600"
            }`}
          >
            <FileSearch className="size-6" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-bold text-slate-900">
              Uploadajte tendersku dokumentaciju
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem će analizirati dokument i automatski kreirati
              tačnu listu potrebne dokumentacije s referencama na stranice.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                <Upload className="size-3" />
                PDF ili DOCX
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Sparkles className="size-3" />
                Analiza zahtjeva
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
