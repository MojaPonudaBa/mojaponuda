"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DangerZone() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    if (confirmText !== "IZBRIŠI") return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Neuspješno brisanje računa");
      }

      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error(error);
      setError("Došlo je do greške prilikom brisanja računa.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setLoading(true);
    try {
      const response = await fetch("/api/lemonsqueezy/customer-portal", { method: "POST" });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Nije moguće otvoriti portal za pretplatu.");
      }
    } catch {
      setError("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-rose-500/20 bg-[linear-gradient(180deg,#1f1723_0%,#0f172a_100%)] p-6 text-white shadow-[0_24px_60px_-42px_rgba(190,24,93,0.2)]">
      <div className="mb-6 flex items-center gap-3 border-b border-rose-500/15 pb-5">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-white">Opasna zona</h2>
          <p className="text-sm text-rose-100/70">Pažljivo s ovim opcijama</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-[1.3rem] border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Otkazivanje pretplate</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
              Vaša pretplata će ostati aktivna do kraja tekućeg obračunskog perioda. Nakon toga, prelazite na besplatni plan.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCancelSubscription}
            disabled={loading}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <CreditCard className="mr-2 size-4" />
            Upravljaj pretplatom
          </Button>
        </div>

        <div className="flex flex-col gap-4 rounded-[1.3rem] border border-rose-500/20 bg-rose-500/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Brisanje računa</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-rose-100/85">
              Trajno brisanje svih vaših podataka, ponuda i dokumenata. Ova radnja se ne može poništiti.
            </p>
          </div>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-rose-500/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 hover:text-rose-50"
              >
                <Trash2 className="mr-2 size-4" />
                Izbriši račun
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl border-slate-800 bg-slate-950 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <AlertTriangle className="size-5 text-rose-300" />
                  Jeste li apsolutno sigurni?
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Ova radnja je nepovratna. Svi vaši podaci bit će trajno uklonjeni s naših servera.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Upišite <span className="font-bold text-white">IZBRIŠI</span> za potvrdu
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    className="border-rose-500/20 bg-white/5 text-white placeholder:text-slate-500"
                    placeholder="IZBRIŠI"
                  />
                </div>
                {error ? (
                  <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                    {error}
                  </p>
                ) : null}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={loading}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  Odustani
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteAccount}
                  disabled={loading || confirmText !== "IZBRIŠI"}
                  className="h-11 rounded-2xl border-rose-500/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 hover:text-rose-50"
                >
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Trajno izbriši
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}
