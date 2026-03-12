"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface OnboardingFormProps {
  companyId: string;
  companyName: string;
}

export function OnboardingForm({ companyId, companyName }: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [jib, setJib] = useState("");
  const [pdv, setPdv] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (jib.trim().length < 12) {
      setError("JIB mora imati najmanje 12 cifara.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        name: name.trim(),
        jib: jib.trim(),
        pdv: pdv.trim() || null,
        address: address.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
      })
      .eq("id", companyId);

    if (updateError) {
      if (updateError.message.includes("duplicate key")) {
        setError("Firma s ovim JIB-om već postoji u sistemu.");
      } else {
        setError("Greška pri spremanju podataka. Pokušajte ponovo.");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Naziv firme</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jib">JIB (identifikacioni broj) *</Label>
          <Input
            id="jib"
            type="text"
            placeholder="4200000000000"
            value={jib}
            onChange={(e) => setJib(e.target.value)}
            required
            disabled={loading}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdv">PDV broj</Label>
          <Input
            id="pdv"
            type="text"
            placeholder="200000000000"
            value={pdv}
            onChange={(e) => setPdv(e.target.value)}
            disabled={loading}
            className="font-mono"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Adresa</Label>
        <Input
          id="address"
          type="text"
          placeholder="Ulica i broj, Grad"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Kontakt email</Label>
          <Input
            id="contactEmail"
            type="email"
            placeholder="info@firma.ba"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Kontakt telefon</Label>
          <Input
            id="contactPhone"
            type="tel"
            placeholder="+387 33 000 000"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Sačuvaj i nastavi
      </Button>
    </form>
  );
}
