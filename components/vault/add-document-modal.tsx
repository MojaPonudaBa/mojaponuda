"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_TYPES } from "@/lib/vault/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Upload, FileText } from "lucide-react";
import { PaywallModal } from "@/components/subscription/paywall-modal";
import type { Document } from "@/types/database";

interface AddDocumentModalProps {
  onSuccess?: (document: Document) => void;
  trigger?: React.ReactNode;
  initialType?: string;
  refreshOnSuccess?: boolean;
}

export function AddDocumentModal({
  onSuccess,
  trigger,
  initialType,
  refreshOnSuccess = true,
}: AddDocumentModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(initialType || "");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; current: number } | null>(null);

  function resetForm() {
    setName("");
    setType(initialType || "");
    setExpiresAt("");
    setFile(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Unesite naziv dokumenta.");
      return;
    }

    if (!file) {
      setError("Odaberite fajl za upload.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Fajl ne smije biti veći od 50 MB.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("file", file);
    if (type) formData.append("type", type);
    if (expiresAt) formData.append("expires_at", new Date(expiresAt).toISOString());

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setLimitInfo({ limit: data.limit, current: data.current });
          setShowPaywall(true);
          setLoading(false);
          return;
        }
        setError(data.error || "Greška pri uploadu.");
        setLoading(false);
        return;
      }

      resetForm();
      setOpen(false);
      
      if (onSuccess && data.document) {
        onSuccess(data.document);
      }

      if (refreshOnSuccess) {
        router.refresh();
      }
    } catch {
      setError("Greška pri uploadu. Pokušajte ponovo.");
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) resetForm();
        }}
      >
        <DialogTrigger asChild>
          {trigger || (
            <Button className="rounded-xl bg-primary text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all font-bold px-6 h-11">
              <Plus className="mr-2 size-4" />
              Dodaj dokument
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="rounded-2xl border-none shadow-2xl sm:max-w-lg bg-white p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-primary">
                <Upload className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-heading font-bold text-slate-900">Novi dokument</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Dodajte dokument u vaš sigurni trezor.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="doc-name" className="text-sm font-bold text-slate-700">Naziv dokumenta <span className="text-red-500">*</span></Label>
              <Input
                id="doc-name"
                type="text"
                placeholder="npr. Uvjerenje o porezu 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Tip dokumenta <span className="text-red-500">*</span></Label>
                <Select value={type} onValueChange={setType} disabled={loading}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm focus:ring-primary focus:border-primary transition-all">
                    <SelectValue placeholder="Odaberite tip" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt} value={dt} className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer py-2.5">
                        {dt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-expires" className="text-sm font-bold text-slate-700">Datum isteka (opciono)</Label>
                <Input
                  id="doc-expires"
                  type="date"
                  lang="bs-BA"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={loading}
                  className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all font-mono text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file" className="text-sm font-bold text-slate-700">Dokument <span className="text-red-500">*</span></Label>
              <div
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer group ${
                  file ? "border-primary bg-blue-50/50" : "border-slate-200 hover:border-primary hover:bg-slate-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="doc-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={loading}
                />
                
                {file ? (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-blue-100 text-primary">
                      <FileText className="size-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[250px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs font-bold text-primary mt-3 hover:underline">
                      Kliknite za promjenu
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-primary transition-colors">
                      <Upload className="size-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      <span className="font-bold text-primary hover:underline">Kliknite za odabir</span> ili prevucite
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, DOCX, XLSX, JPG (max 50MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-6"
              >
                Odustani
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11 rounded-xl bg-primary text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all font-bold px-8"
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Spremi dokument
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title="Dostigli ste limit prostora"
        description={`Vaš trenutni paket omogućava maksimalno ${(limitInfo?.limit || 0) / (1024*1024*1024)} GB prostora. Trenutno koristite ${((limitInfo?.current || 0) / (1024*1024*1024)).toFixed(2)} GB. Nadogradite paket za više prostora.`}
        limitType="storage"
      />
    </>
  );
}
