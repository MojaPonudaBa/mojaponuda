"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Brain, X, Plus, Sparkles, Save, Building2, MapPin, Mail, Phone } from "lucide-react";

interface ProfileSettingsProps {
  company: {
    id: string;
    name: string;
    jib: string;
    pdv: string | null;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    cpv_codes: string[] | null;
    keywords: string[] | null;
    operating_regions: string[] | null;
  };
}

export function ProfileSettings({ company }: ProfileSettingsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(company.name);
  const [jib, setJib] = useState(company.jib);
  const [pdv, setPdv] = useState(company.pdv || "");
  const [address, setAddress] = useState(company.address || "");
  const [contactEmail, setContactEmail] = useState(company.contact_email || "");
  const [contactPhone, setContactPhone] = useState(company.contact_phone || "");

  // Smart Profiling State
  const [description, setDescription] = useState("");
  const [cpvCodes, setCpvCodes] = useState<string[]>(company.cpv_codes || []);
  const [keywords, setKeywords] = useState<string[]>(company.keywords || []);
  const [regions, setRegions] = useState<string[]>(company.operating_regions || []);
  
  const [generating, setGenerating] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newRegion, setNewRegion] = useState("");

  async function generateProfile() {
    if (!description.trim() || description.length < 10) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (res.ok) {
        // Merge or replace? Let's merge unique values to not lose existing ones, or maybe replace? 
        // User might want to refresh completely. Let's append new ones that don't exist.
        // Actually for a "Generate" action, replacing/updating suggestion is usually better, but let's keep unique set.
        
        const uniqueCpv = Array.from(new Set([...cpvCodes, ...(data.cpv_codes || [])]));
        const uniqueKeywords = Array.from(new Set([...keywords, ...(data.keywords || [])]));
        const uniqueRegions = Array.from(new Set([...regions, ...(data.suggested_regions || [])]));

        setCpvCodes(uniqueCpv);
        setKeywords(uniqueKeywords);
        setRegions(uniqueRegions);
      } else {
        setError("Greška pri generisanju profila: " + data.error);
      }
    } catch (e) {
      console.error(e);
      setError("Greška pri komunikaciji sa AI servisom.");
    } finally {
      setGenerating(false);
    }
  }

  function removeTag(list: string[], setList: (l: string[]) => void, item: string) {
    setList(list.filter(i => i !== item));
  }

  function addKeyword(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && newKeyword.trim()) {
      e.preventDefault();
      if (!keywords.includes(newKeyword.trim())) {
        setKeywords([...keywords, newKeyword.trim()]);
      }
      setNewKeyword("");
    }
  }

  function addRegion(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && newRegion.trim()) {
      e.preventDefault();
      if (!regions.includes(newRegion.trim())) {
        setRegions([...regions, newRegion.trim()]);
      }
      setNewRegion("");
    }
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        name,
        jib,
        pdv: pdv || null,
        address: address || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        cpv_codes: cpvCodes,
        keywords: keywords,
        operating_regions: regions,
      })
      .eq("id", company.id);

    if (updateError) {
      setError("Greška pri spremanju podataka: " + updateError.message);
    } else {
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-900">Osnovni podaci</h2>
            <p className="text-sm text-slate-500">Informacije o vašoj firmi</p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Naziv firme</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>JIB</Label>
              <Input value={jib} onChange={(e) => setJib(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>PDV Broj</Label>
              <Input value={pdv} onChange={(e) => setPdv(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adresa</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input className="pl-9" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input className="pl-9" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input className="pl-9" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Profiling */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Brain className="size-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-900">Smart Profil</h2>
            <p className="text-sm text-slate-500">Podešavanja za AI preporuku tendera</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
            <div className="space-y-2">
              <Label className="text-purple-900 font-bold">AI Generator</Label>
              <p className="text-xs text-slate-500 mb-2">
                Unesite opis djelatnosti da AI automatski dopuni ključne riječi i kodove.
              </p>
              <Textarea 
                placeholder="Bavimo se..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white min-h-[80px]"
              />
              <Button 
                onClick={generateProfile} 
                disabled={generating || description.length < 5}
                size="sm"
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                Generiši tagove
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ključne riječi</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Dodaj ključnu riječ..." 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={addKeyword}
                  className="max-w-xs"
                />
                <Button size="icon" variant="outline" onClick={() => {
                  if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                    setKeywords([...keywords, newKeyword.trim()]);
                    setNewKeyword("");
                  }
                }}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[44px]">
                {keywords.length === 0 && <span className="text-xs text-slate-400 italic">Nema ključnih riječi</span>}
                {keywords.map(k => (
                  <Badge key={k} variant="outline" className="bg-white border-slate-200 text-slate-700 gap-1 pr-1">
                    {k}
                    <button onClick={() => removeTag(keywords, setKeywords, k)} className="hover:text-red-500"><X className="size-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>CPV Kodovi</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[44px]">
                {cpvCodes.length === 0 && <span className="text-xs text-slate-400 italic">Nema CPV kodova</span>}
                {cpvCodes.map(c => (
                  <Badge key={c} variant="secondary" className="gap-1 pr-1">
                    {c}
                    <button onClick={() => removeTag(cpvCodes, setCpvCodes, c)} className="hover:text-red-500"><X className="size-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Regije interesa</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Dodaj regiju (npr. Sarajevo)..." 
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  onKeyDown={addRegion}
                  className="max-w-xs"
                />
                <Button size="icon" variant="outline" onClick={() => {
                  if (newRegion.trim() && !regions.includes(newRegion.trim())) {
                    setRegions([...regions, newRegion.trim()]);
                    setNewRegion("");
                  }
                }}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[44px]">
                {regions.length === 0 && <span className="text-xs text-slate-400 italic">Cijela BiH (Default)</span>}
                {regions.map(r => (
                  <Badge key={r} variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 gap-1 pr-1">
                    {r}
                    <button onClick={() => removeTag(regions, setRegions, r)} className="hover:text-red-500"><X className="size-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {success && (
          <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-in slide-in-from-bottom-5 fade-in">
            Promjene sačuvane!
          </div>
        )}
        {error && (
          <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-in slide-in-from-bottom-5 fade-in">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="rounded-full px-8 py-6 text-base font-bold shadow-xl shadow-blue-500/20"
        >
          {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Save className="mr-2 size-5" />}
          Sačuvaj promjene
        </Button>
      </div>
    </div>
  );
}
