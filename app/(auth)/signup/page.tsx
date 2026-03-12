"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const errorMessages: Record<string, string> = {
  "User already registered": "Korisnik s ovim emailom već postoji.",
  "Password should be at least 6 characters":
    "Lozinka mora imati najmanje 6 znakova.",
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
      setError("Lozinka mora imati najmanje 6 znakova.");
      setLoading(false);
      return;
    }

    if (companyName.trim().length < 2) {
      setError("Unesite naziv firme.");
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

    // 2. Ako je korisnik odmah autentificiran (email potvrda isključena),
    //    kreiraj zapis u companies tabeli i preusmjeri na /onboarding
    if (data.session && data.user) {
      const { error: companyError } = await supabase.from("companies").insert({
        user_id: data.user.id,
        name: companyName.trim(),
        jib: "",
      });

      if (companyError) {
        console.error("Greška pri kreiranju firme:", companyError.message);
      }

      router.push("/onboarding");
      router.refresh();
      return;
    }

    // 3. Ako je email potvrda uključena, prikaži poruku
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Provjerite email
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Poslali smo vam link za potvrdu na <strong>{email}</strong>.
            Kliknite na link da aktivirate svoj račun.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">Nazad na prijavu</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          MojaPonuda<span className="text-primary">.ba</span>
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Kreirajte novi račun
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="companyName">Naziv firme</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Vaša firma d.o.o."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vas@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Lozinka</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Registracija
          </Button>
          <p className="text-sm text-muted-foreground">
            Već imate račun?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Prijavite se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
