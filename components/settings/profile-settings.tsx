"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  derivePrimaryIndustry,
  getCategorySpecializationOptions,
  getProfileOptionLabel,
  OFFERING_CATEGORY_GROUPS,
  OFFERING_CATEGORY_OPTIONS,
  parseCompanyProfile,
  serializeCompanyProfile,
} from "@/lib/company-profile";
import { getRegionSelectionLabels } from "@/lib/constants/regions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import { Loader2, Brain, Save, Building2, MapPin, Mail, Phone, ChevronDown, Check } from "lucide-react";

interface ProfileSettingsProps {
  company: {
    id: string;
    name: string;
    jib: string;
    pdv: string | null;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    industry: string | null;
    cpv_codes: string[] | null;
    keywords: string[] | null;
    operating_regions: string[] | null;
  };
}

/**
 * Settings form is the source of truth for a company's recommendation profile.
 * It collects exactly the fields the onboarding collects (Step 1 + Step 2):
 *   - offeringCategories   (Šta tačno radite)
 *   - description          (Čime se firma bavi) — required
 *   - pastClients          (Za koga ste radili)
 *   - licenses             (Licence i certifikati)
 *   - notOffered           (Šta NE radite)
 *   - operating_regions    (Lokacija firme)
 *
 * On save we:
 *   1. UPDATE companies row (basic info + industry JSON blob + regions).
 *   2. POST /api/onboarding/save-embedding to regenerate profile_embedding
 *      and purge the tender_relevance LLM cache for this company, so the next
 *      /dashboard/tenders?tab=recommended render re-scores against the new
 *      profile. This is why legacy fields (manual CPV, manual keywords,
 *      Radovi/Usluge/Robe, specializations) have been removed — they are not
 *      inputs to the new embedding pipeline and editing them was misleading.
 */

export function ProfileSettings({ company }: ProfileSettingsProps) {
  const router = useRouter();
  const parsedProfile = useMemo(() => parseCompanyProfile(company.industry), [company.industry]);
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

  const [description, setDescription] = useState(
    parsedProfile.companyDescription ?? parsedProfile.legacyIndustryText ?? ""
  );
  const [pastClients, setPastClients] = useState(parsedProfile.pastClients ?? "");
  const [licenses, setLicenses] = useState(parsedProfile.licenses ?? "");
  const [notOffered, setNotOffered] = useState(parsedProfile.notOffered ?? "");
  const [offeringCategories, setOfferingCategories] = useState<string[]>(
    parsedProfile.offeringCategories ?? []
  );
  const [specializationIds, setSpecializationIds] = useState<string[]>(
    parsedProfile.specializationIds ?? []
  );
  const [regions, setRegions] = useState<string[]>(company.operating_regions || []);

  const [expandedSection, setExpandedSection] = useState<"offering" | null>(null);
  const derivedPrimaryIndustry = useMemo(
    () => derivePrimaryIndustry(offeringCategories, parsedProfile.primaryIndustry),
    [offeringCategories, parsedProfile.primaryIndustry]
  );
  const regionSelectionLabels = useMemo(() => getRegionSelectionLabels(regions), [regions]);
  const specializationSections = useMemo(
    () =>
      offeringCategories
        .map((categoryId) => {
          const options = getCategorySpecializationOptions(categoryId);
          return options.length > 0
            ? {
                categoryId,
                categoryLabel: getProfileOptionLabel(categoryId),
                options,
              }
            : null;
        })
        .filter(
          (
            section
          ): section is {
            categoryId: string;
            categoryLabel: string;
            options: ReturnType<typeof getCategorySpecializationOptions>;
          } => Boolean(section)
        ),
    [offeringCategories]
  );

  useEffect(() => {
    const allowedSpecializationIds = new Set(
      offeringCategories.flatMap((categoryId) =>
        getCategorySpecializationOptions(categoryId).map((option) => option.id)
      )
    );

    setSpecializationIds((current) =>
      current.filter((specializationId) => allowedSpecializationIds.has(specializationId))
    );
  }, [offeringCategories]);

  function toggleSelection(
    value: string,
    current: string[],
    setState: (value: string[]) => void
  ) {
    if (current.includes(value)) {
      setState(current.filter((item) => item !== value));
      return;
    }

    setState([...current, value]);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (description.trim().length < 10) {
      setError("Opis firme mora imati najmanje 10 karaktera (2–5 rečenica).");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Step 1: persist basic info + structured profile (including new embedding
    // fields) in the industry JSON blob. We keep existing cpv_codes/keywords
    // untouched — those are AI-generated helper columns used by legacy code
    // paths and admin diagnostics, and should not be user-editable.
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        name,
        jib,
        pdv: pdv || null,
        address: address || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        industry: serializeCompanyProfile({
          ...parsedProfile,
          primaryIndustry: derivedPrimaryIndustry,
          offeringCategories,
          specializationIds,
          preferredTenderTypes: parsedProfile.preferredTenderTypes ?? [],
          companyDescription: description,
          pastClients: pastClients.trim() || null,
          licenses: licenses.trim() || null,
          notOffered: notOffered.trim() || null,
          manualKeywords: parsedProfile.manualKeywords ?? [],
        }),
        operating_regions: regions,
      })
      .eq("id", company.id);

    if (updateError) {
      setError("Greška pri spremanju podataka: " + updateError.message);
      setLoading(false);
      return;
    }

    // Step 2: regenerate profile_embedding + purge tender_relevance cache so
    // the recommendation pipeline re-scores this company against the updated
    // profile on the next /dashboard/tenders render.
    try {
      const categoryText = offeringCategories
        .map((id) => getProfileOptionLabel(id))
        .filter(Boolean)
        .join(", ");
      const res = await fetch("/api/onboarding/save-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          pastClients: pastClients.trim() || null,
          licenses: licenses.trim() || null,
          notOffered: notOffered.trim() || null,
          regionsText: regionSelectionLabels.join(", ") || null,
          categoryText: categoryText || null,
          companyId: company.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          "Profil je spremljen, ali osvježavanje preporuka nije uspjelo: " +
            (data?.error ?? `HTTP ${res.status}`)
        );
        setLoading(false);
        return;
      }
    } catch (embedError) {
      console.error("settings: save-embedding error", embedError);
      setError(
        "Profil je spremljen, ali osvježavanje preporuka nije uspjelo. Pokušajte ponovo."
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 3000);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <div className="rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)] [&_.text-slate-900]:text-white [&_.text-slate-700]:text-slate-200 [&_.text-slate-600]:text-slate-300 [&_.text-slate-500]:text-slate-400 [&_input]:border-white/10 [&_input]:bg-white/[0.03] [&_input]:text-white [&_input]:placeholder:text-slate-500 [&_textarea]:border-white/10 [&_textarea]:bg-white/[0.03] [&_textarea]:text-white [&_textarea]:placeholder:text-slate-500 [&_label]:text-slate-300">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sky-300">
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

      {/* Search Profile */}
      <div className="rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)] [&_.text-slate-900]:text-white [&_.text-slate-700]:text-slate-200 [&_.text-slate-600]:text-slate-300 [&_.text-slate-500]:text-slate-400 [&_input]:border-white/10 [&_input]:bg-white/[0.03] [&_input]:text-white [&_input]:placeholder:text-slate-500 [&_textarea]:border-white/10 [&_textarea]:bg-white/[0.03] [&_textarea]:text-white [&_textarea]:placeholder:text-slate-500 [&_label]:text-slate-300">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-violet-300">
            <Brain className="size-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-900">Profil preporuka</h2>
            <p className="text-sm text-slate-500">Ova polja su isti podaci koje ste unijeli u onboardingu. Izmjene automatski osvježe preporuke.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => setExpandedSection((value) => value === "offering" ? null : "offering")}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Šta tačno radite</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {offeringCategories.length > 0
                      ? `${offeringCategories.length} odabranih oblasti`
                      : "Odaberite oblasti koje firma stvarno nudi"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    Klikni za uređivanje
                  </span>
                  <ChevronDown className={cn("size-4 text-slate-600 transition-transform", expandedSection === "offering" ? "rotate-180" : "rotate-0")} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {derivedPrimaryIndustry ? (
                  <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700">
                    Fokus: {getProfileOptionLabel(derivedPrimaryIndustry)}
                  </Badge>
                ) : null}
                {offeringCategories.slice(0, 3).map((item) => (
                  <Badge key={item} variant="outline" className="bg-white text-slate-700">
                    {getProfileOptionLabel(item)}
                  </Badge>
                ))}
                {specializationIds.slice(0, 2).map((item) => (
                  <Badge key={item} variant="outline" className="border-amber-100 bg-amber-50 text-amber-700">
                    {getProfileOptionLabel(item)}
                  </Badge>
                ))}
                {offeringCategories.length > 3 ? (
                  <Badge variant="outline" className="bg-white text-slate-500">
                    +{offeringCategories.length - 3}
                  </Badge>
                ) : null}
              </div>
            </button>

          </div>

          {expandedSection === "offering" ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4">
                <Label className="text-base font-bold text-slate-900">Odaberite sve što firma stvarno radi</Label>
                <p className="mt-1 text-sm text-slate-500">
                  Ovo je isti izbor koji koristimo u onboardingu za preporuke i analizu tržišta.
                </p>
              </div>
              <div className="space-y-5">
                {OFFERING_CATEGORY_GROUPS.map((group) => {
                  const groupOptions = OFFERING_CATEGORY_OPTIONS.filter((option) =>
                    group.optionIds.includes(option.id)
                  );

                  return (
                    <div key={group.id} className="rounded-2xl border border-white/10 bg-black/10 p-5">
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
                                  ? "border-sky-400/40 bg-sky-500/12 text-white shadow-sm shadow-sky-500/10"
                                  : "border-white/10 bg-white/[0.03] text-slate-100 hover:border-white/20 hover:bg-white/[0.06]"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={cn("text-sm font-semibold", selected ? "text-white" : "text-slate-100")}>{option.label}</p>
                                  <p className={cn("mt-2 text-sm leading-6", selected ? "text-slate-300" : "text-slate-400")}>{option.description}</p>
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

                {specializationSections.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                    <div className="mb-4">
                      <Label className="text-base font-bold text-slate-900">Preciznije usmjerite preporuke prema onome što zaista nudite</Label>
                      <p className="mt-1 text-sm text-slate-500">
                        Ovi izbori služe kao smjer za preporuke i analizu tržišta. Ne zaključavaju vas tvrdo na usku nišu, nego pomažu da preporuke bolje razumiju vaš stvarni poslovni fokus.
                      </p>
                    </div>
                    <div className="space-y-5">
                      {specializationSections.map((section) => (
                        <div key={section.categoryId} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-slate-900">{section.categoryLabel}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Označite smjerove koji najbolje opisuju vaš glavni fokus unutar ove oblasti.
                            </p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {section.options.map((option) => {
                              const selected = specializationIds.includes(option.id);

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => toggleSelection(option.id, specializationIds, setSpecializationIds)}
                                  className={cn(
                                    "rounded-2xl border p-4 text-left transition-all",
                                    selected
                                      ? "border-amber-400/40 bg-amber-500/10 shadow-sm shadow-amber-500/10"
                                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-100">{option.label}</p>
                                      <p className="mt-2 text-sm leading-6 text-slate-400">{option.description}</p>
                                    </div>
                                    {selected ? <Check className="mt-0.5 size-4 text-amber-300" /> : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-5">
            {/* Opis firme — required, drives the embedding */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-100">
                Čime se vaša firma točno bavi?
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Npr: Bavimo se isporukom i instalacijom serverske i mrežne opreme. Prodajemo softverske licence i pružamo IT podršku javnim institucijama."
                className="min-h-[100px] rounded-2xl"
              />
              <p className="text-xs text-slate-500">
                Opišite šta radite i za koga — 2 do 5 rečenica je sasvim dovoljno. AI koristi ovaj opis za preporuke.
              </p>
            </div>

            {/* Opciona polja — svako daje embeddingu dodatni kontekst */}
            <div className="space-y-2">
              <Label htmlFor="pastClients" className="text-sm font-semibold text-slate-100">
                Za koga ste do sada radili?
              </Label>
              <Input
                id="pastClients"
                value={pastClients}
                onChange={(event) => setPastClients(event.target.value)}
                placeholder="Npr: Klinički centar, općine u FBiH, javna preduzeća"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenses" className="text-sm font-semibold text-slate-100">
                Imate li posebne licence ili certifikate?
              </Label>
              <Input
                id="licenses"
                value={licenses}
                onChange={(event) => setLicenses(event.target.value)}
                placeholder="Npr: ISO 9001, licenca MUP-a, vatrogasno ovlaštenje"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notOffered" className="text-sm font-semibold text-slate-100">
                Što vaša firma NE radi? (koje tendere ne želite vidjeti)
              </Label>
              <Input
                id="notOffered"
                value={notOffered}
                onChange={(event) => setNotOffered(event.target.value)}
                placeholder="Npr: Ne izvodimo građevinske radove, ne isporučujemo hranu ni vozila"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-100">Lokacija firme / poslovnica</Label>
              <p className="text-xs text-slate-500">
                Označite šire područje, gradove i općine gdje je firma ili poslovnica. Bliži tenderi imaju prednost u preporukama.
              </p>
              <RegionMultiSelect selectedRegions={regions} onChange={setRegions} />
              {regionSelectionLabels.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Ako ništa ne odaberete, prikazivat ćemo prilike sa nivoa cijele BiH.</p>
              ) : null}
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
          className="h-12 rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 shadow-xl shadow-slate-950/20 hover:bg-slate-100"
        >
          {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Save className="mr-2 size-5" />}
          Sačuvaj promjene
        </Button>
      </div>
    </div>
  );
}
