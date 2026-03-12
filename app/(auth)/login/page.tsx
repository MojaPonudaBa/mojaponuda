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
  "Invalid login credentials": "Pogrešan email ili lozinka.",
  "Email not confirmed": "Email adresa nije potvrđena. Provjerite inbox.",
  "Invalid email or password": "Pogrešan email ili lozinka.",
  "Too many requests": "Previše pokušaja. Pokušajte ponovo za nekoliko minuta.",
  "User not found": "Korisnik s ovim emailom ne postoji.",
};

function translateError(message: string): string {
  return errorMessages[message] || "Greška pri prijavi. Pokušajte ponovo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <Card className="border-border bg-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          MojaPonuda<span className="text-primary">.ba</span>
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Prijavite se na svoj račun
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Lozinka</Label>
              <Link
                href="/reset-password"
                className="text-xs text-muted-foreground hover:text-primary"
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
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Prijava
          </Button>
          <p className="text-sm text-muted-foreground">
            Nemate račun?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Registrujte se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
