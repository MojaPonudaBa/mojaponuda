"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { AlertTriangle, Trash2, CreditCard, LogOut, Loader2 } from "lucide-react";

export function DangerZone() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleDeleteAccount() {
    if (confirmText !== "IZBRIŠI") return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Neuspješno brisanje računa");
      }
      
      await supabase.auth.signOut();
      router.push("/login");
    } catch (e) {
      console.error(e);
      setError("Došlo je do greške prilikom brisanja računa.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setLoading(true);
    // Redirect to Lemon Squeezy portal or internal API
    try {
      const res = await fetch("/api/lemonsqueezy/customer-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Nije moguće otvoriti portal za pretplatu.");
      }
    } catch (e) {
      setError("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.5rem] border border-red-100 bg-red-50/30 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-red-100 pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-red-900">Opasna zona</h2>
            <p className="text-sm text-red-600/80">Pažljivo s ovim opcijama</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Subscription Cancellation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-red-100/50">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">Otkazivanje pretplate</h3>
              <p className="text-sm text-slate-500 max-w-md">
                Vaša pretplata će ostati aktivna do kraja tekućeg obračunskog perioda. Nakon toga, prelazite na besplatni plan.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleCancelSubscription}
              disabled={loading}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 shrink-0"
            >
              <CreditCard className="mr-2 size-4" />
              Upravljanje pretplatom
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-red-100/50">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">Brisanje računa</h3>
              <p className="text-sm text-slate-500 max-w-md">
                Trajno brisanje svih vaših podataka, ponuda i dokumenata. Ova radnja se ne može poništiti.
              </p>
            </div>
            
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 shrink-0"
                >
                  <Trash2 className="mr-2 size-4" />
                  Izbriši račun
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="size-5" />
                    Jeste li apsolutno sigurni?
                  </DialogTitle>
                  <DialogDescription>
                    Ova radnja je nepovratna. Svi vaši podaci bit će trajno uklonjeni s naših servera.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">
                      Upišite <span className="font-bold text-slate-900">IZBRIŠI</span> za potvrdu
                    </Label>
                    <Input 
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="border-red-200 focus-visible:ring-red-500"
                      placeholder="IZBRIŠI"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded-lg">
                      {error}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button 
                    variant="ghost" 
                    onClick={() => setDeleteOpen(false)}
                    disabled={loading}
                  >
                    Odustani
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    disabled={loading || confirmText !== "IZBRIŠI"}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Trajno izbriši
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
