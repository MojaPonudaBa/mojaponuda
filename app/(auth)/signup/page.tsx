"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

const errorMessages: Record<string, string> = {
  "User already registered": "Korisnik sa ovom email adresom već postoji.",
  "Password should be at least 6 characters":
    "Lozinka mora imati minimalno 6 znakova.",
  "Too many requests": "Previše pokušaja. Pokušajte ponovo za nekoliko minuta.",
  "Signup requires a valid password":
    "Unesite validnu lozinku.",
};

function translateError(message: string): string {
  return errorMessages[message] || "Greška pri registraciji. Pokušajte ponovo.";
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

    // 1. Registruj korisnika, sačuvaj naziv firme u user_metadata
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (signUpError) {
      setError(translateError(signUpError.message));
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      router.push("/onboarding");
      router.refresh();
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
          Link za verifikaciju je uspješno poslan na:<br/>
          <span className="font-semibold text-slate-900 mt-2 block">{email}</span><br/>
          Molimo potvrdite vašu email adresu kako biste nastavili sa registracijom.
        </p>
        <Link href="/login" className="block">
          <Button variant="outline" className="w-full h-12 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 transition-all">
            Vrati se na prijavu
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
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
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
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
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
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
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
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 rounded-full bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5 mt-2" 
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
          Registruj se
        </Button>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-500">
            Već imate račun?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-blue-700 transition-colors">
              Prijavite se
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
