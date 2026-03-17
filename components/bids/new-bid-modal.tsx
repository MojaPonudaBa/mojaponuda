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
import { Plus, Loader2, Briefcase, Search, ArrowLeft } from "lucide-react";

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
        <Button className="rounded-xl bg-primary text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all font-bold px-6 h-11">
          <Plus className="mr-2 size-4" />
          Nova ponuda
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-none shadow-2xl sm:max-w-lg bg-white p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-primary">
              <Briefcase className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-heading font-bold text-slate-900">Nova ponuda</DialogTitle>
              <DialogDescription className="text-slate-500">
                Otvorite novu pripremu ponude.
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

          {!isManual ? (
            <>
              {/* Pretraga tendera */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Pretraži tendere</Label>
                <div className="relative group">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Unesite naziv tendera..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedTender(null);
                    }}
                    disabled={loading}
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Lista tendera */}
              {search.length > 0 && !selectedTender && (
                <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 custom-scrollbar">
                  {filteredTenders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-medium text-slate-900">Nema rezultata</p>
                      <p className="text-xs text-slate-500 mt-1">Pokušajte sa drugim nazivom ili unesite ručno.</p>
                    </div>
                  ) : (
                    filteredTenders.slice(0, 20).map((tender) => (
                      <button
                        key={tender.id}
                        type="button"
                        onClick={() => {
                          setSelectedTender(tender);
                          setSearch(tender.title);
                        }}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-white hover:shadow-sm hover:text-primary group"
                      >
                        <p className="font-bold text-slate-700 group-hover:text-primary">{tender.title}</p>
                        {tender.contracting_authority && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tender.contracting_authority}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedTender && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">Odabrani tender</p>
                  <p className="text-sm font-bold text-blue-900">
                    {selectedTender.title}
                  </p>
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedTender(null);
                      setSearch("");
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline mt-2"
                  >
                    Promijeni
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsManual(true)}
                  className="text-sm font-medium text-slate-500 hover:text-primary hover:underline transition-colors"
                >
                  Tender nije u bazi? Unesite ručno
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Ručni unos */}
              <div className="space-y-2">
                <Label htmlFor="manual-title" className="text-sm font-bold text-slate-700">Naziv tendera <span className="text-red-500">*</span></Label>
                <Input
                  id="manual-title"
                  type="text"
                  placeholder="npr. Nabavka kancelarijskog materijala"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-authority" className="text-sm font-bold text-slate-700">Naručilac</Label>
                <Input
                  id="manual-authority"
                  type="text"
                  placeholder="npr. Grad Sarajevo"
                  value={manualAuthority}
                  onChange={(e) => setManualAuthority(e.target.value)}
                  disabled={loading}
                  className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManual(false);
                    setManualTitle("");
                    setManualAuthority("");
                  }}
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="size-3" />
                  Nazad na pretragu tendera
                </button>
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
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
              Kreiraj ponudu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
