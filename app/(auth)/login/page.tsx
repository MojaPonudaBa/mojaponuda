"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { TenderSistemLogo } from "@/components/brand/tender-sistem-logo";

const errorMessages: Record<string, string> = {
  "Invalid login credentials": "Pogrešan email ili lozinka.",
  "Email not confirmed": "Email adresa nije potvrđena. Provjerite inbox.",
  "Invalid email or password": "Pogrešan email ili lozinka.",
  "Too many requests": "Previše pokušaja. Pokušajte ponovo za nekoliko minuta.",
  "User not found": "Korisnik s ovim emailom ne postoji.",
  otp_expired:
    "Signup link je istekao ili je već otvoren. Ako koristite Outlook, otvorite najnoviji email ili pošaljite novi link.",
  access_denied: "Potvrda email adrese nije uspjela. Pokušajte ponovo iz najnovijeg emaila.",
  auth_callback_failed: "Prijava preko email linka nije uspjela. Pokušajte ponovo.",
};

function translateError(message: string): string {
  return errorMessages[message] || "Greška pri prijavi. Pokušajte ponovo.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const redirectError = useMemo(() => {
    const code = searchParams.get("error_code") ?? searchParams.get("error");
    const description = searchParams.get("error_description");

    if (code) {
      return translateError(code);
    }

    if (description) {
      return description;
    }

    return null;
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-blue-500/5 sm:p-10">
      <div className="mb-10 text-center">
        <TenderSistemLogo href="/" size="md" className="mb-6" />
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          Dobrodošli nazad
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Unesite svoje podatke za pristup platformi
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        {(error ?? redirectError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error ?? redirectError}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Lozinka
            </Label>
            <Link
              href="/reset-password"
              className="text-sm font-semibold text-primary transition-colors hover:text-blue-700"
            >
              Zaboravili ste lozinku?
            </Link>
          </div>
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

        <Button
          type="submit"
          className="h-12 w-full rounded-full bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
          Prijavi se
        </Button>

        <div className="pt-2 text-center">
          <p className="text-sm text-slate-500">
            Nemate korisnički račun?{" "}
            <Link href="/signup" className="font-semibold text-primary transition-colors hover:text-blue-700">
              Isprobajte besplatno
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
