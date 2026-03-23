"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  demoBidSummaries,
  getDemoChecklistItems,
  getDemoDocumentInserts,
  getDemoSubscriptionInsert,
  isDemoUser,
} from "@/lib/demo";
import {
  buildProfileContextText,
  buildProfileKeywordSeeds,
  derivePrimaryIndustry,
  getProfileOptionLabel,
  OFFERING_CATEGORY_GROUPS,
  OFFERING_CATEGORY_OPTIONS,
  parseCompanyProfile,
  sanitizeSearchKeywords,
  serializeCompanyProfile,
  TENDER_TYPE_OPTIONS,
} from "@/lib/company-profile";
import { getRegionSelectionLabels } from "@/lib/constants/regions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Building2,
  Check,
  Compass,
  Loader2,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react";

interface OnboardingGuidedFormProps {
  companyId: string;
  companyName: string;
  initialJib: string;
  initialPdv: string;
  initialAddress: string;
  initialContactEmail: string;
  initialContactPhone: string;
  initialIndustry: string;
  initialCpvCodes?: string[];
  initialKeywords?: string[];
  initialRegions?: string[];
}

const STEPS = [
  {
    id: "company",
    title: "Osnovni podaci",
    description: "Ko ste i kako vas naručioci mogu identifikovati.",
    icon: Building2,
  },
  {
    id: "offer",
    title: "Čime se bavite",
    description: "Odaberite sve što realno nudite. Možete označiti više različitih oblasti bez konflikta.",
    icon: Brain,
  },
  {
    id: "tenders",
    title: "Kakve tendere pratite",
    description: "Definišite tip tendera i gdje se želite prijavljivati.",
    icon: Target,
  },
  {
    id: "description",
    title: "Dopunite svojim riječima",
    description: "Kratak opis firme daje AI-u dodatni kontekst za preciznije preporuke.",
    icon: Compass,
  },
] as const;

export function OnboardingGuidedForm({
  companyId,
  companyName,
  initialJib,
  initialPdv,
  initialAddress,
  initialContactEmail,
  initialContactPhone,
  initialIndustry,
  initialCpvCodes = [],
  initialKeywords = [],
  initialRegions = [],
}: OnboardingGuidedFormProps) {
  const router = useRouter();
  const parsedProfile = useMemo(() => parseCompanyProfile(initialIndustry), [initialIndustry]);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(companyName);
  const [jib, setJib] = useState(initialJib);
  const [pdv, setPdv] = useState(initialPdv);
  const [address, setAddress] = useState(initialAddress);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [contactPhone, setContactPhone] = useState(initialContactPhone);
  const [offeringCategories, setOfferingCategories] = useState<string[]>(parsedProfile.offeringCategories);
  const [preferredTenderTypes, setPreferredTenderTypes] = useState<string[]>(parsedProfile.preferredTenderTypes);
  const [regions, setRegions] = useState<string[]>(initialRegions);
  const [description, setDescription] = useState(
    parsedProfile.companyDescription ?? parsedProfile.legacyIndustryText ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Završavam profil...");
  const derivedPrimaryIndustry = useMemo(
    () => derivePrimaryIndustry(offeringCategories, parsedProfile.primaryIndustry),
    [offeringCategories, parsedProfile.primaryIndustry]
  );
  const regionSelectionLabels = useMemo(() => getRegionSelectionLabels(regions), [regions]);

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

  function toggleSelection(value: string, items: string[], setItems: (next: string[]) => void) {
    if (items.includes(value)) {
      setItems(items.filter((item) => item !== value));
      return;
    }

    setItems([...items, value]);
  }

  function validateStep(targetStep: number): string | null {
    if (targetStep === 0) {
      if (!name.trim()) return "Unesite puni naziv firme.";
      if (jib.trim().length < 12) return "JIB mora imati najmanje 12 cifara.";
    }

    if (targetStep === 1) {
      if (offeringCategories.length === 0) {
        return "Odaberite barem jednu stvar koju vaša firma stvarno nudi.";
      }
    }

    if (targetStep === 2) {
      if (preferredTenderTypes.length === 0) {
        return "Odaberite barem jedan tip tendera koji želite pratiti.";
      }
    }

    if (targetStep === 3) {
      if (!description.trim() || description.trim().length < 30) {
        return "Opišite firmu sa barem 30 karaktera kako bismo preciznije preporučili tendere.";
      }
    }

    return null;
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateStep(0) || validateStep(1) || validateStep(2) || validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingText("Analiziram profil firme...");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sesija je istekla. Prijavite se ponovo.");
      setLoading(false);
      return;
    }

    const profileContext = buildProfileContextText({
      description,
      primaryIndustry: derivedPrimaryIndustry,
      offeringCategories,
      preferredTenderTypes,
      regions: regionSelectionLabels,
    });

    const profileSeeds = buildProfileKeywordSeeds({
      primaryIndustry: derivedPrimaryIndustry,
      offeringCategories,
      preferredTenderTypes,
      companyDescription: description,
      legacyIndustryText: null,
    });

    let generatedCpv = initialCpvCodes;
    let generatedKeywords = initialKeywords;

    try {
      const res = await fetch("/api/onboarding/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          primaryIndustry: derivedPrimaryIndustry,
          offeringCategories,
          preferredTenderTypes,
          regions: regionSelectionLabels,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        generatedCpv = data.cpv_codes || [];
        generatedKeywords = data.keywords || [];
      }
    } catch (generationError) {
      console.error("Onboarding profile generation error:", generationError);
    }

    const keywords = sanitizeSearchKeywords([
      ...initialKeywords,
      ...generatedKeywords,
      ...profileSeeds,
    ]);

    const payload = {
      name: name.trim(),
      jib: jib.trim(),
      pdv: pdv.trim() || null,
      address: address.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      industry:
        serializeCompanyProfile({
          primaryIndustry: derivedPrimaryIndustry,
          offeringCategories,
          preferredTenderTypes,
          companyDescription: description,
          legacyIndustryText: null,
        }) ?? profileContext,
      cpv_codes: generatedCpv,
      keywords,
      operating_regions: regions,
    };

    setLoadingText("Spremam profil i pripremam početni pregled...");

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

    router.push("/dashboard");
    router.refresh();
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const currentStep = STEPS[step];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Korak {step + 1} od {STEPS.length}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">{currentStep.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{currentStep.description}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Napredak</p>
            <p className="mt-2 font-heading text-3xl font-bold text-slate-950">{step + 1}/{STEPS.length}</p>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (index <= step) {
                  setError(null);
                  setStep(index);
                }
              }}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                index === step
                  ? "border-blue-200 bg-blue-50/80 shadow-sm"
                  : index < step
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-slate-200 bg-white"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <item.icon className={cn("size-4", index === step ? "text-blue-700" : index < step ? "text-emerald-700" : "text-slate-400")} />
                {index < step ? <Check className="size-4 text-emerald-700" /> : <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {step === 0 ? (
        <div className="grid gap-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Naziv firme</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} disabled={loading} className="h-11 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jib" className="text-sm font-semibold text-slate-700">JIB</Label>
              <Input id="jib" value={jib} onChange={(event) => setJib(event.target.value)} disabled={loading} className="h-11 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdv" className="text-sm font-semibold text-slate-700">PDV broj</Label>
              <Input id="pdv" value={pdv} onChange={(event) => setPdv(event.target.value)} disabled={loading} className="h-11 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address" className="text-sm font-semibold text-slate-700">Sjedište firme</Label>
              <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} disabled={loading} placeholder="Ulica i broj, grad" className="h-11 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-sm font-semibold text-slate-700">Kontakt email</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} disabled={loading} className="h-11 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-sm font-semibold text-slate-700">Kontakt telefon</Label>
              <Input id="contactPhone" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} disabled={loading} className="h-11 rounded-xl border-slate-200" />
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">Odaberite sve što vaša firma stvarno radi</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ne tražimo od vas jednu &quot;primarnu djelatnost&quot; jer mnoge firme nude više različitih usluga, roba i radova. Označite sve što realno nudite, a preporuke će se same prilagoditi vašem profilu.
            </p>
          </div>
          <div className="space-y-5">
            {OFFERING_CATEGORY_GROUPS.map((group) => {
              const groupOptions = OFFERING_CATEGORY_OPTIONS.filter((option) =>
                group.optionIds.includes(option.id)
              );

              return (
                <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {groupOptions.map((option) => {
                      const selected = offeringCategories.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleSelection(option.id, offeringCategories, setOfferingCategories)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all",
                            selected
                              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={cn("text-sm font-semibold", selected ? "text-white" : "text-slate-900")}>{option.label}</p>
                              <p className={cn("mt-2 text-sm leading-6", selected ? "text-slate-300" : "text-slate-500")}>{option.description}</p>
                            </div>
                            {selected ? <Check className="mt-0.5 size-4 text-blue-200" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Kako ćemo vas prepoznati u preporukama</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {derivedPrimaryIndustry ? (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Fokus firme: {getProfileOptionLabel(derivedPrimaryIndustry)}
                </span>
              ) : null}
              {offeringCategories.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {getProfileOptionLabel(item)}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div>
            <p className="text-sm font-semibold text-slate-700">Koje vrste tendera želite pratiti</p>
            <p className="mt-1 text-sm text-slate-500">Odaberite sve što vam je relevantno. Ovo utiče na to šta će vam prvo izlaziti u preporukama.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {TENDER_TYPE_OPTIONS.map((option) => {
              const selected = preferredTenderTypes.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleSelection(option.id, preferredTenderTypes, setPreferredTenderTypes)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-blue-200 bg-blue-50/80 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{option.description}</p>
                    </div>
                    {selected ? <Check className="mt-0.5 size-4 text-blue-700" /> : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <MapPin className="size-4 text-blue-600" />
              <p className="text-sm font-semibold">Gdje se prijavljujete</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Odaberite regije u kojima realno možete izvršiti ugovor. Možete označiti cijeli kanton odjednom ili samo pojedine gradove i općine.</p>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-800">
                Ako ništa ne odaberete, tretirat ćemo vas kao firmu koja radi na nivou cijele BiH.
              </p>
            </div>
            <div className="mt-4">
              <RegionMultiSelect selectedRegions={regions} onChange={setRegions} />
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">Opišite firmu svojim riječima</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Uključite proizvode, usluge, radove, ključne reference, specijalizacije i sve što vam je bitno za preporuke. Što ste konkretniji, preporuke tendera će biti preciznije.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Opis firme</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading}
              placeholder="Npr. Bavimo se implementacijom poslovnog softvera, održavanjem mrežne infrastrukture, isporukom servera i obukom korisnika za javni sektor širom BiH..."
              className="min-h-[180px] rounded-2xl border-slate-200 bg-white"
            />
            <p className="text-xs text-slate-500">Preporuka: napišite 2 do 5 konkretnih rečenica o tome šta radite, kome isporučujete i na kojim vrstama ugovora ste najjači.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-slate-900">Sažetak onoga što ćemo koristiti za preporuke</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {derivedPrimaryIndustry ? (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {getProfileOptionLabel(derivedPrimaryIndustry)}
                </span>
              ) : null}
              {offeringCategories.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {getProfileOptionLabel(item)}
                </span>
              ))}
              {preferredTenderTypes.map((item) => (
                <span key={item} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {getProfileOptionLabel(item)}
                </span>
              ))}
              {regionSelectionLabels.length > 0 ? (
                regionSelectionLabels.map((region) => (
                  <span key={region} className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {region}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  Cijela BiH
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={loading || step === 0}
          onClick={() => {
            setError(null);
            setStep((current) => Math.max(current - 1, 0));
          }}
          className="h-11 rounded-xl border-slate-200 px-5"
        >
          <ArrowLeft className="mr-2 size-4" />
          Nazad
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={goNext}
            disabled={loading}
            className="h-11 rounded-xl bg-slate-950 px-5 font-semibold text-white hover:bg-blue-700"
          >
            Nastavi
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {loading ? loadingText : "Završi onboarding i otvori dashboard"}
          </Button>
        )}
      </div>
    </form>
  );
}
