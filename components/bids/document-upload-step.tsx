"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FileText, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadStepProps {
  tenderId: string;
  tenderTitle: string;
  onComplete?: () => void;
}

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

export function DocumentUploadStep({
  tenderId,
  tenderTitle,
  onComplete,
}: UploadStepProps) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [requirementsFound, setRequirementsFound] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileName(file.name);
      setState("uploading");
      setProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("tender_id", tenderId);

      try {
        setStatusText("Učitavam dokument...");
        const uploadRes = await fetch("/api/tenders/upload-documentation", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error || "Upload failed");
        }

        setProgress(30);
        setState("processing");

        const { documentId } = await uploadRes.json();
        await pollProcessingStatus(documentId);
      } catch (error) {
        console.error("Upload error:", error);
        setError(
          error instanceof Error ? error.message : "Greška pri uploadu"
        );
        setState("error");
      }
    },
    [tenderId]
  );

  async function pollProcessingStatus(documentId: string) {
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(interval);
        setError("Obrada dokumenta traje predugo. Pokušajte ponovo.");
        setState("error");
        return;
      }

      try {
        const res = await fetch(
          `/api/tenders/document-status/${documentId}`
        );
        const data = await res.json();

        if (data.status === "extracting") {
          setProgress(50);
          setStatusText(
            data.pageCount
              ? `Čitam ${data.pageCount} stranica...`
              : "Čitam dokument..."
          );
        } else if (data.status === "analyzing") {
          setProgress(70);
          setStatusText("Identificiram zahtjeve...");
        } else if (data.status === "complete") {
          clearInterval(interval);
          setProgress(100);
          setStatusText("Sastavljam listu...");
          setRequirementsFound(data.requirementsCount);
          setState("complete");
        } else if (data.status === "error") {
          clearInterval(interval);
          setError(data.error || "Greška pri obradi dokumenta");
          setState("error");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1000);
  }

  async function handleContinue() {
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tender_id: tenderId,
          auto_generate_checklist: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Greška pri kreiranju ponude");
      }

      const { bid } = await res.json();
      router.push(`/dashboard/bids/${bid.id}`);
    } catch (error) {
      console.error("Continue error:", error);
      setError(
        error instanceof Error ? error.message : "Greška pri kreiranju ponude"
      );
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: state !== "idle" && state !== "error",
  });

  if (state === "complete") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">
            Pronađeno {requirementsFound} zahtjeva u dokumentaciji
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Analizirali smo tendersku dokumentaciju i sastavili detaljnu listu
            potrebnih dokumenata.
          </p>
        </div>
        <Button
          onClick={handleContinue}
          size="lg"
          className="rounded-xl font-bold"
        >
          <Sparkles className="mr-2 size-4" />
          Nastavi na pripremu
        </Button>
      </div>
    );
  }

  if (state === "uploading" || state === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
          <Loader2 className="size-8 text-blue-600 animate-spin" />
        </div>
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 truncate">
              {fileName}
            </span>
            <span className="text-slate-500">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 text-center">{statusText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">
          Priprema ponude
        </h2>
        <p className="text-slate-600">{tenderTitle}</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-900">{error}</p>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`
          relative rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer
          ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-white border-2 border-slate-200">
            <FileText className="size-8 text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium text-slate-900">
              {isDragActive
                ? "Pustite dokument ovdje"
                : "Prevucite tendersku dokumentaciju ovdje"}
            </p>
            <p className="text-sm text-slate-500">ili kliknite za odabir</p>
          </div>
          <p className="text-xs text-slate-400">PDF, DOC, DOCX do 50MB</p>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
        <div className="flex gap-3">
          <Sparkles className="size-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900">
              Automatska analiza dokumentacije
            </p>
            <p className="text-xs text-blue-700">
              Analizirat ćemo dokumentaciju i automatski sastaviti listu
              potrebnih dokumenata sa referencama na stranice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
