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
        setError("Greška pri spremanju podataka. Molimo pokušajte ponovo.");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
          Puni naziv firme
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
          className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary"
        />
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jib" className="text-sm font-semibold text-slate-700">
            JIB (Identifikacioni broj) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="jib"
            type="text"
            placeholder="4200000000000"
            value={jib}
            onChange={(e) => setJib(e.target.value)}
            required
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdv" className="text-sm font-semibold text-slate-700">
            PDV broj (Opciono)
          </Label>
          <Input
            id="pdv"
            type="text"
            placeholder="200000000000"
            value={pdv}
            onChange={(e) => setPdv(e.target.value)}
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm font-semibold text-slate-700">
          Sjedište (Adresa i Grad)
        </Label>
        <Input
          id="address"
          type="text"
          placeholder="Ulica i broj, Grad"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
          className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary"
        />
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactEmail" className="text-sm font-semibold text-slate-700">
            Kontakt Email
          </Label>
          <Input
            id="contactEmail"
            type="email"
            placeholder="info@firma.ba"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone" className="text-sm font-semibold text-slate-700">
            Kontakt Telefon
          </Label>
          <Input
            id="contactPhone"
            type="tel"
            placeholder="+387 33 000 000"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full rounded-full bg-primary py-6 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5 mt-4" 
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
        Završi podešavanje profila
      </Button>
    </form>
  );
}
