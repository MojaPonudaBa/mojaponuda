"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Loader2 } from "lucide-react";

interface Tender {
  id: string;
  title: string;
  contracting_authority: string | null;
}

interface NewBidModalProps {
  tenders: Tender[];
}

export function NewBidModal({ tenders }: NewBidModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthority, setManualAuthority] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredTenders = tenders.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setSearch("");
    setSelectedTender(null);
    setManualTitle("");
    setManualAuthority("");
    setIsManual(false);
    setError(null);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedTender && !manualTitle.trim()) {
      setError("Odaberite tender ili unesite naziv ručno.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tender_id: selectedTender?.id || null,
          tender_title: isManual ? manualTitle.trim() : null,
          contracting_authority: isManual ? manualAuthority.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Greška pri kreiranju ponude.");
        setLoading(false);
        return;
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Greška pri kreiranju ponude.");
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
          Nova ponuda
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova ponuda</DialogTitle>
          <DialogDescription>
            Odaberite tender iz baze ili unesite naziv ručno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!isManual ? (
            <>
              {/* Pretraga tendera */}
              <div className="space-y-2">
                <Label>Pretraži tendere</Label>
                <Input
                  type="text"
                  placeholder="Unesite naziv tendera..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedTender(null);
                  }}
                  disabled={loading}
                />
              </div>

              {/* Lista tendera */}
              {search.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                  {filteredTenders.length === 0 ? (
                    <p className="p-3 text-center text-sm text-muted-foreground">
                      Nema rezultata.
                    </p>
                  ) : (
                    filteredTenders.slice(0, 20).map((tender) => (
                      <button
                        key={tender.id}
                        type="button"
                        onClick={() => {
                          setSelectedTender(tender);
                          setSearch(tender.title);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          selectedTender?.id === tender.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <p className="font-medium">{tender.title}</p>
                        {tender.contracting_authority && (
                          <p className="text-xs text-muted-foreground">
                            {tender.contracting_authority}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedTender && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm font-medium text-primary">
                    Odabrano: {selectedTender.title}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsManual(true)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Tender nije u bazi? Unesite ručno →
              </button>
            </>
          ) : (
            <>
              {/* Ručni unos */}
              <div className="space-y-2">
                <Label htmlFor="manual-title">Naziv tendera *</Label>
                <Input
                  id="manual-title"
                  type="text"
                  placeholder="npr. Nabavka kancelarijskog materijala"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-authority">Naručilac</Label>
                <Input
                  id="manual-authority"
                  type="text"
                  placeholder="npr. Grad Sarajevo"
                  value={manualAuthority}
                  onChange={(e) => setManualAuthority(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsManual(false);
                  setManualTitle("");
                  setManualAuthority("");
                }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                ← Nazad na pretragu tendera
              </button>
            </>
          )}

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
              Kreiraj ponudu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
