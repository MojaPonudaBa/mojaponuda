"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getBaseUrl } from "@/lib/site-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { TenderSistemLogo } from "@/components/brand/tender-sistem-logo";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const baseUrl = getBaseUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
    });

    if (error) {
      setError("Greška pri slanju emaila. Pokušajte ponovo.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-blue-500/5 sm:p-10">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-emerald-50 p-4">
            <CheckCircle2 className="size-12 text-emerald-500" />
          </div>
        </div>
        <h2 className="mb-4 font-heading text-2xl font-bold text-slate-900">
          Provjerite Vaš Email
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-slate-500">
          Ako račun s adresom <span className="font-semibold text-slate-900">{email}</span> postoji, poslali smo vam link za resetovanje lozinke.
        </p>
        <Link href="/login" className="block">
          <Button variant="outline" className="h-12 w-full rounded-full border-slate-200 text-slate-700 transition-all hover:bg-slate-50">
            <ArrowLeft className="mr-2 size-4" />
            Nazad na prijavu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-blue-500/5 sm:p-10">
      <div className="mb-10 text-center">
        <TenderSistemLogo href="/" size="md" className="mb-6" />
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          Resetovanje lozinke
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Unesite email adresu i poslaćemo vam link za resetovanje.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
            Email adresa
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="vas@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm transition-all focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="h-12 w-full rounded-full bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
            Pošalji link
          </Button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Nazad na prijavu
          </Link>
        </div>
      </form>
    </div>
  );
}
