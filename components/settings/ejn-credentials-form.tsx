"use client";

import { useState, useTransition } from "react";
import { KeyRound, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { saveEjnCredentialsAction, removeEjnCredentialsAction } from "@/app/actions/ejn-credentials";
import { Button } from "@/components/ui/button";

interface Props {
  hasCredentials: boolean;
}

export function EjnCredentialsForm({ hasCredentials: initialHas }: Props) {
  const [hasCredentials, setHasCredentials] = useState(initialHas);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSave(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await saveEjnCredentialsAction(formData);
        setHasCredentials(true);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Greška pri spašavanju.");
      }
    });
  }

  function onRemove() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await removeEjnCredentialsAction();
        setHasCredentials(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Greška pri brisanju.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-slate-700">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-slate-900">Lozinka se čuva u enkriptovanom obliku.</p>
          <p className="mt-1">
            Kredencijali se koriste isključivo za automatsko preuzimanje tenderske dokumentacije sa eJN portala u vaše
            ime. Možete ih obrisati bilo kad.
          </p>
        </div>
      </div>

      {hasCredentials ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <KeyRound className="size-4" />
            eJN nalog povezan
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            Sistem koristi vaše kredencijale za preuzimanje TD-a čim pokrenete akciju na tender stranici.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={isPending}
            className="mt-3"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Ukloni kredencijale
          </Button>
        </div>
      ) : (
        <form action={onSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Korisničko ime / email</label>
            <input
              type="text"
              name="username"
              required
              autoComplete="off"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="korisnik@primjer.ba"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Lozinka</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="new-password"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600">Kredencijali sačuvani.</p>}

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Poveži eJN nalog
          </Button>
        </form>
      )}

      <p className="text-xs text-slate-500">
        Napomena: auto-preuzimanje TD-a zahtijeva headless browser worker koji se odvojeno deploya (Railway / Render /
        VPS). Do tada je opcija u razvojnom načinu — kredencijali se sigurno čuvaju, ali se ne izvršava download.
      </p>
    </div>
  );
}
