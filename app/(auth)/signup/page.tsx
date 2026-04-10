"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { resolveSignupRedirectPath } from "@/lib/agency";
import { TenderSistemLogo } from "@/components/brand/tender-sistem-logo";

const errorMessages: Record<string, string> = {
  "User already registered": "Korisnik sa ovom email adresom već postoji.",
  "Password should be at least 6 characters":
    "Lozinka mora imati minimalno 6 znakova.",
  "Too many requests": "Previše pokušaja. Pokušajte ponovo za nekoliko minuta.",
  "Signup requires a valid password":
    "Unesite validnu lozinku.",
  "Email link is invalid":
    "Link za potvrdu nije ispravno podešen. Provjerite auth postavke i pokušajte ponovo.",
};

function translateError(message: string): string {
  if (message.toLowerCase().includes("redirect") || message.toLowerCase().includes("email link")) {
    return "Registracija trenutno nije dostupna zbog auth postavki za potvrdu emaila. Pokušajte ponovo za nekoliko minuta.";
  }

  return errorMessages[message] || "Greška pri registraciji. Pokušajte ponovo.";
}

function isExistingAccountSignupResponse(data: {
  session: unknown;
  user: { identities?: Array<unknown> | null } | null;
}): boolean {
  return Boolean(
    !data.session &&
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0,
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Lozinke se ne poklapaju.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Lozinka mora imati minimalno 6 znakova.");
      setLoading(false);
      return;
    }

    if (companyName.trim().length < 2) {
      setError("Unesite ispravan naziv firme.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName.trim(),
        },
      },
    });

    if (signUpError) {
      setError(translateError(signUpError.message));
      setLoading(false);
      return;
    }

    if (isExistingAccountSignupResponse(data)) {
      setError(
        "Račun sa ovom email adresom već postoji. Prijavite se ili resetujte lozinku ako je ne znate.",
      );
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      router.push(resolveSignupRedirectPath(email));
      router.refresh();
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
          Link za verifikaciju je uspješno poslan na:<br />
          <span className="mt-2 block font-semibold text-slate-900">{email}</span><br />
          Molimo potvrdite vašu email adresu kako biste nastavili sa registracijom. Ako poruka ne stigne u narednih 1-2 minute, provjerite spam folder i pokušajte ponovo.
        </p>
        <Link href="/login" className="block">
          <Button variant="outline" className="h-12 w-full rounded-full border-slate-200 text-slate-700 transition-all hover:bg-slate-50">
            Vrati se na prijavu
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
          Kreirajte Vaš Račun
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Započnite besplatno upravljanje tenderima.
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-sm font-semibold text-slate-700">
            Naziv firme
          </Label>
          <Input
            id="companyName"
            type="text"
            placeholder="Vaša firma d.o.o."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm transition-all focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
            Lozinka
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm transition-all focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
            Potvrdite lozinku
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm transition-all focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>

        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-full bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
          Registruj se
        </Button>

        <div className="pt-2 text-center">
          <p className="text-sm text-slate-500">
            Već imate račun?{" "}
            <Link href="/login" className="font-semibold text-primary transition-colors hover:text-blue-700">
              Prijavite se
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
