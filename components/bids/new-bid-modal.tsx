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
import { Plus, Loader2, Briefcase, Search, ArrowLeft, ArrowUpRight } from "lucide-react";

interface Tender {
  id: string;
  title: string;
  contracting_authority: string | null;
}

interface NewBidModalProps {
  tenders: Tender[];
  agencyClientId?: string;
  bidPathBase?: string;
}

export function NewBidModal({
  tenders,
  agencyClientId,
  bidPathBase = "/dashboard/bids",
}: NewBidModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthority, setManualAuthority] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistAction, setAssistAction] = useState<{ label: string; href: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredTenders = tenders.filter((tender) =>
    tender.title.toLowerCase().includes(search.toLowerCase()),
  );

  function resetForm() {
    setSearch("");
    setSelectedTender(null);
    setManualTitle("");
    setManualAuthority("");
    setIsManual(false);
    setError(null);
    setAssistAction(null);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAssistAction(null);

    if (!selectedTender && !manualTitle.trim()) {
      setError("Odaberite tender ili unesite naziv rucno.");
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
          agency_client_id: agencyClientId ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "PREPARATION_CREDITS_REQUIRED") {
          const resolvedAgencyClientId =
            (data.agencyClientId as string | null | undefined) ?? agencyClientId ?? null;
          const targetHref = resolvedAgencyClientId
            ? `/dashboard/subscription?agencyClientId=${resolvedAgencyClientId}#pripreme`
            : "/dashboard/subscription#pripreme";

          setError(data.error || "Nemate dostupnu pripremu za nastavak.");
          setAssistAction({ label: "Dopuni pripreme", href: targetHref });
          setLoading(false);
          return;
        }

        if (data.code === "SUBSCRIPTION_REQUIRED" || data.code === "LIMIT_REACHED") {
          setError(data.error || "Za nastavak je potrebna aktivna pretplata.");
          setAssistAction({ label: "Pogledaj pakete", href: "/dashboard/subscription" });
          setLoading(false);
          return;
        }

        setError(data.error || "Greska pri kreiranju ponude.");
        setLoading(false);
        return;
      }

      resetForm();
      setOpen(false);

      if (data.bid?.id) {
        router.push(`${bidPathBase}/${data.bid.id}`);
        return;
      }

      router.refresh();
    } catch {
      setError("Greska pri kreiranju ponude.");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-11 rounded-xl bg-primary px-6 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40">
          <Plus className="mr-2 size-4" />
          Nova ponuda
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-2xl border-none bg-white p-0 shadow-2xl sm:max-w-lg">
        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 pb-4 pt-6">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-primary">
              <Briefcase className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-xl font-bold text-slate-900">Nova ponuda</DialogTitle>
              <DialogDescription className="text-slate-500">
                Otvorite novu pripremu ponude.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
              {error}
            </div>
          ) : null}

          {assistAction ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm leading-6 text-blue-900">
                Potrebna vam je još jedna radnja prije otvaranja ponude. Sistem vas vodi direktno na pravo mjesto.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(assistAction.href);
                }}
                className="mt-3 h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-blue-700"
              >
                {assistAction.label}
                <ArrowUpRight className="ml-2 size-4" />
              </Button>
            </div>
          ) : null}

          {!isManual ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Pretrazi tendere</Label>
                <div className="group relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                  <Input
                    type="text"
                    placeholder="Unesite naziv tendera..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedTender(null);
                    }}
                    disabled={loading}
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm transition-all focus-visible:border-primary focus-visible:ring-primary"
                  />
                </div>
              </div>

              {search.length > 0 && !selectedTender ? (
                <div className="custom-scrollbar max-h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                  {filteredTenders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-medium text-slate-900">Nema rezultata</p>
                      <p className="mt-1 text-xs text-slate-500">Pokusajte sa drugim nazivom ili unesite rucno.</p>
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
                        className="group w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-white hover:text-primary hover:shadow-sm"
                      >
                        <p className="font-bold text-slate-700 group-hover:text-primary">{tender.title}</p>
                        {tender.contracting_authority ? (
                          <p className="mt-0.5 text-xs text-slate-500">{tender.contracting_authority}</p>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {selectedTender ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-500">Odabrani tender</p>
                  <p className="text-sm font-bold text-blue-900">{selectedTender.title}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTender(null);
                      setSearch("");
                    }}
                    className="mt-2 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                  >
                    Promijeni
                  </button>
                </div>
              ) : null}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsManual(true)}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-primary hover:underline"
                >
                  Tender nije u bazi? Unesite rucno
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-title" className="text-sm font-bold text-slate-700">
                  Naziv tendera <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="manual-title"
                  type="text"
                  placeholder="npr. Nabavka kancelarijskog materijala"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm transition-all focus-visible:border-primary focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-authority" className="text-sm font-bold text-slate-700">
                  Narucilac
                </Label>
                <Input
                  id="manual-authority"
                  type="text"
                  placeholder="npr. Grad Sarajevo"
                  value={manualAuthority}
                  onChange={(e) => setManualAuthority(e.target.value)}
                  disabled={loading}
                  className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm transition-all focus-visible:border-primary focus-visible:ring-primary"
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
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-primary"
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
              className="h-11 rounded-xl border-slate-200 px-6 font-bold text-slate-700 hover:bg-slate-50"
            >
              Odustani
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-primary px-8 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30"
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Kreiraj ponudu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
