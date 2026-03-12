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
import { Plus, Loader2, Upload } from "lucide-react";

export function AddDocumentModal() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setName("");
    setType("");
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

    if (file.size > 10 * 1024 * 1024) {
      setError("Fajl ne smije biti veći od 10 MB.");
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
        setError(data.error || "Greška pri uploadu.");
        setLoading(false);
        return;
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Greška pri uploadu. Pokušajte ponovo.");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Dodaj dokument
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj novi dokument</DialogTitle>
          <DialogDescription>
            Uploadajte dokument u trezor vaše firme.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="doc-name">Naziv dokumenta *</Label>
            <Input
              id="doc-name"
              type="text"
              placeholder="npr. Uvjerenje o porezu 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Tip dokumenta *</Label>
            <Select value={type} onValueChange={setType} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberite tip" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {dt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-expires">Datum isteka (opciono)</Label>
            <Input
              id="doc-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={loading}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-file">Fajl *</Label>
            <div
              className="relative flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50"
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
              <div className="text-center">
                <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
                {file ? (
                  <p className="text-sm font-medium text-foreground">
                    {file.name}{" "}
                    <span className="text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Kliknite da odaberete fajl (max 10 MB)
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Odustani
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
