"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  demoBidSummaries,
  getDemoChecklistItems,
  getDemoDocumentInserts,
  getDemoSubscriptionInsert,
  isDemoUser,
} from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Brain, Sparkles } from "lucide-react";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";

interface OnboardingFormProps {
  companyId: string;
  companyName: string;
  initialJib: string;
  initialPdv: string;
  initialAddress: string;
  initialContactEmail: string;
  initialContactPhone: string;
  initialCpvCodes?: string[];
  initialKeywords?: string[];
  initialRegions?: string[];
}

export function OnboardingForm({
  companyId,
  companyName,
  initialJib,
  initialPdv,
  initialAddress,
  initialContactEmail,
  initialContactPhone,
  initialCpvCodes = [],
  initialKeywords = [],
  initialRegions = [],
}: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [jib, setJib] = useState(initialJib);
  const [pdv, setPdv] = useState(initialPdv);
  const [address, setAddress] = useState(initialAddress);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [contactPhone, setContactPhone] = useState(initialContactPhone);

  const [description, setDescription] = useState("");
  const [regions, setRegions] = useState<string[]>(initialRegions);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Završi podešavanje profila");

  async function seedDemoData(userId: string, savedCompanyId: string) {
    const supabase = createClient();

    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingSubscription) {
      await supabase.from("subscriptions").insert(getDemoSubscriptionInsert(userId));
    }

    const { count: existingDocumentsCount } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", savedCompanyId);

    let documentIds: string[] = [];

    if ((existingDocumentsCount ?? 0) === 0) {
      const demoDocuments = getDemoDocumentInserts(savedCompanyId);
      const { data: insertedDocuments } = await supabase
        .from("documents")
        .insert(demoDocuments)
        .select("id");

      documentIds =
        insertedDocuments?.map((document) => document.id) ??
        demoDocuments.map((document) => document.id ?? "").filter(Boolean);
    } else {
      const { data: existingDocuments } = await supabase
        .from("documents")
        .select("id")
        .eq("company_id", savedCompanyId)
        .limit(3);

      documentIds = existingDocuments?.map((document) => document.id) ?? [];
    }

    const { count: existingBidsCount } = await supabase
      .from("bids")
      .select("id", { count: "exact", head: true })
      .eq("company_id", savedCompanyId);

    if ((existingBidsCount ?? 0) > 0) {
      return;
    }

    const { data: tenders } = await supabase
      .from("tenders")
      .select("id")
      .not("deadline", "is", null)
      .order("deadline", { ascending: true })
      .limit(demoBidSummaries.length);

    if (!tenders?.length) {
      return;
    }

    const bidPayload = tenders.map((tender, index) => ({
      company_id: savedCompanyId,
      tender_id: tender.id,
      status: demoBidSummaries[index]?.status ?? "draft",
      notes:
        index === 0
          ? "Finalno uskladiti tehničku specifikaciju i potvrditi reference prije predaje."
          : index === 1
            ? "Provjeriti SLA i potpisanu izjavu o podršci."
            : "Sačuvati kao referentni primjer uspješne ponude.",
      ai_analysis: {
        risk_flags:
          index === 0
            ? ["Ističe porezno uvjerenje", "Nedostaje referentna lista"]
            : index === 1
              ? ["Provjeriti rok za podršku"]
              : [],
      },
    }));

    const { data: insertedBids } = await supabase
      .from("bids")
      .insert(bidPayload)
      .select("id");

    if (!insertedBids?.length) {
      return;
    }

    for (const bid of insertedBids) {
      const checklistItems = getDemoChecklistItems(bid.id, documentIds);

      await supabase.from("bid_checklist_items").insert(checklistItems);

      if (documentIds.length > 0) {
        await supabase.from("bid_documents").insert(
          documentIds.slice(0, 2).map((documentId, index) => ({
            bid_id: bid.id,
            document_id: documentId,
            checklist_item_name: checklistItems[index]?.title ?? null,
            is_confirmed: index === 0,
          }))
        );
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoadingText("Kreiranje profila...");

    if (jib.trim().length < 12) {
      setError("JIB mora imati najmanje 12 cifara.");
      setLoading(false);
      return;
    }

    if (!description.trim() || description.length < 10) {
      setError("Molimo opišite čime se bavite sa barem 10 karaktera.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sesija je istekla. Prijavite se ponovo.");
      setLoading(false);
      return;
    }

    let generatedCpv = initialCpvCodes;
    let generatedKeywords = initialKeywords;

    // AI Profiliranje
    setLoadingText("Sistem pronalazi idealne tendere...");
    try {
      const res = await fetch("/api/onboarding/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (res.ok) {
        generatedCpv = data.cpv_codes || [];
        generatedKeywords = data.keywords || [];
      } else {
        console.error(data.error);
        // Continue anyway if AI fails
      }
    } catch (e) {
      console.error(e);
      // Continue anyway if AI fails
    }

    setLoadingText("Spremanje podataka...");

    const payload = {
      name: name.trim(),
      jib: jib.trim(),
      pdv: pdv.trim() || null,
      address: address.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      cpv_codes: generatedCpv,
      keywords: generatedKeywords,
      operating_regions: regions,
    };

    let savedCompanyId = companyId;
    let saveError: { message: string } | null = null;

    if (companyId) {
      const { error: updateError } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", companyId);

      saveError = updateError;
    } else {
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingCompany?.id) {
        savedCompanyId = existingCompany.id;

        const { error: updateError } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", existingCompany.id);

        saveError = updateError;
      } else {
        const { data: insertedCompany, error: insertError } = await supabase
          .from("companies")
          .insert({
            user_id: user.id,
            ...payload,
          })
          .select("id")
          .single();

        savedCompanyId = insertedCompany?.id ?? "";
        saveError = insertError;
      }
    }

    if (saveError) {
      if (saveError.message.includes("duplicate key")) {
        setError("Firma s ovim JIB-om je već registrovana.");
      } else {
        setError("Greška pri spremanju podataka. Molimo pokušajte ponovo.");
      }
      setLoading(false);
      return;
    }

    if (isDemoUser(user.email) && savedCompanyId) {
      try {
        await seedDemoData(user.id, savedCompanyId);
      } catch (seedError) {
        console.error("Demo seed error:", seedError);
      }
    }

    router.push("/dashboard/tenders?tab=recommended");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {/* Osnovni podaci */}
      <div className="space-y-6">
        <h2 className="text-xl font-heading font-bold text-slate-900 border-b border-slate-100 pb-2">
          1. Osnovni podaci o firmi
        </h2>

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
      </div>

      {/* Smart Profiling Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Brain className="size-5 text-purple-600" />
          <h2 className="text-xl font-heading font-bold text-slate-900">
            2. Čime se bavite?
          </h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Opišite svoju firmu svojim riječima
            </Label>
            <Textarea
              placeholder="Npr. Bavimo se izvođenjem građevinskih radova, niskogradnja i visokogradnja. Također nudimo usluge projektovanja i nadzora..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              required
              className="min-h-[120px] rounded-xl border-slate-200 bg-white"
            />
            <p className="text-xs text-slate-500">
              Sistem će na osnovu ovog opisa automatski pronalaziti tendere koji vam odgovaraju. Što detaljnije opišete usluge i proizvode, rezultati će biti bolji.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Regije u kojima radite
            </Label>
            <RegionMultiSelect
              selectedRegions={regions}
              onChange={setRegions}
            />
            <p className="text-xs text-slate-500">
              Odaberite općine/gradove u kojima obavljate poslove. Ako ne odaberete nijednu, pretpostavit ćemo da radite na nivou cijele države.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100">
        <Button
          type="submit"
          className="w-full rounded-full bg-primary py-6 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Sparkles className="mr-2 size-5 text-yellow-300" />}
          {loadingText}
        </Button>
      </div>
    </form>
  );
}
