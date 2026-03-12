"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
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
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl shadow-blue-500/5 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-emerald-50 p-4">
            <CheckCircle2 className="size-12 text-emerald-500" />
          </div>
        </div>
        <h2 className="mb-4 font-heading text-2xl font-bold text-slate-900">
          Provjerite Vaš Email
        </h2>
        <p className="mb-8 text-sm text-slate-500 leading-relaxed">
          Ako račun s adresom <span className="font-semibold text-slate-900">{email}</span> postoji, poslali smo vam link za resetovanje lozinke.
        </p>
        <Link href="/login" className="block">
          <Button variant="outline" className="w-full h-12 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 transition-all">
            <ArrowLeft className="mr-2 size-4" />
            Nazad na prijavu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl shadow-blue-500/5">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-baseline gap-0.5 mb-6">
          <span className="font-heading text-2xl font-bold tracking-tight text-slate-900">
            MojaPonuda
          </span>
          <span className="font-heading text-2xl font-bold text-primary">.ba</span>
        </Link>
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
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
        </div>
        
        <div className="pt-2 flex flex-col gap-4">
          <Button 
            type="submit" 
            className="w-full h-12 rounded-full bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
            Pošalji link
          </Button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" />
            Nazad na prijavu
          </Link>
        </div>
      </form>
    </div>
  );
}
