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
  TENDER_TYPE_OPTIONS,
  sanitizeSearchKeywords,
  serializeCompanyProfile,
} from "@/lib/company-profile";
import {
  BIH_REGION_GROUPS,
  getRegionSelectionLabels } from "@/lib/constants/regions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import { Loader2, Brain, X, Plus, Sparkles, Save, Building2, MapPin, Mail, Phone, ChevronDown, Check } from "lucide-react";

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
  const [offeringCategories, setOfferingCategories] = useState<string[]>(
    parsedProfile.offeringCategories ?? []
  );
  const [specializationIds, setSpecializationIds] = useState<string[]>(
    parsedProfile.specializationIds ?? []
  );
  const [preferredTenderTypes, setPreferredTenderTypes] = useState<string[]>(
    parsedProfile.preferredTenderTypes ?? []
  );
  const [cpvCodes, setCpvCodes] = useState<string[]>(company.cpv_codes || []);
  const [manualKeywords, setManualKeywords] = useState<string[]>(
    sanitizeSearchKeywords(parsedProfile.manualKeywords ?? [])
  );
  const [hiddenGeneratedKeywords, setHiddenGeneratedKeywords] = useState<string[]>(
    sanitizeSearchKeywords(
      (company.keywords || []).filter(
        (keyword) => !sanitizeSearchKeywords(parsedProfile.manualKeywords ?? []).includes(keyword)
      )
    )
  );
  const [regions, setRegions] = useState<string[]>(company.operating_regions || []);
  
  const [generating, setGenerating] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCpvCode, setNewCpvCode] = useState("");
  const [expandedSection, setExpandedSection] = useState<"offering" | "tender-types" | null>(null);
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

  async function generateProfile() {
    if (!description.trim() || description.length < 10) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          primaryIndustry: derivedPrimaryIndustry,
          offeringCategories,
          specializationIds,
          preferredTenderTypes,
          regions: regionSelectionLabels,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const uniqueCpv = Array.from(new Set([...cpvCodes, ...(data.cpv_codes || [])]));
        const uniqueHiddenKeywords = sanitizeSearchKeywords([
          ...hiddenGeneratedKeywords,
          ...(data.keywords || []),
        ]);
        const uniqueRegions = Array.from(new Set([...regions, ...(data.suggested_regions || [])]));

        setCpvCodes(uniqueCpv);
        setHiddenGeneratedKeywords(uniqueHiddenKeywords);
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
      setManualKeywords(sanitizeSearchKeywords([...manualKeywords, newKeyword.trim()]));
      setNewKeyword("");
    }
  }

  function addCpvCode(e?: React.KeyboardEvent) {
    if (e && e.key !== 'Enter') {
      return;
    }

    if (e) {
      e.preventDefault();
    }

    const normalizedCode = newCpvCode.trim();

    if (!normalizedCode) {
      return;
    }

    setCpvCodes(Array.from(new Set([...cpvCodes, normalizedCode])));
    setNewCpvCode("");
  }

  function removeRegionLabel(label: string) {
    const group = BIH_REGION_GROUPS.find((item) => item.parentRegion === label);

    if (group?.parentRegion) {
      setRegions(regions.filter((region) => !group.municipalities.includes(region)));
      return;
    }

    setRegions(regions.filter((region) => region !== label));
  }

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

    const supabase = createClient();
    const combinedKeywords = sanitizeSearchKeywords([
      ...hiddenGeneratedKeywords,
      ...manualKeywords,
    ]);
    
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
          preferredTenderTypes,
          companyDescription: description,
          manualKeywords,
        }),
        cpv_codes: cpvCodes,
        keywords: combinedKeywords,
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

      {/* Search Profile */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Brain className="size-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-900">Profil preporuka</h2>
            <p className="text-sm text-slate-500">Ovdje dopunjujete opis firme, svoje dodatne pojmove i CPV kodove.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => setExpandedSection((value) => value === "offering" ? null : "offering")}
              className="rounded-2xl border border-slate-300 bg-slate-100/90 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow-md"
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

            <button
              type="button"
              onClick={() => setExpandedSection((value) => value === "tender-types" ? null : "tender-types")}
              className="rounded-2xl border border-slate-300 bg-slate-100/90 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Koje tendere pratite</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {preferredTenderTypes.length > 0
                      ? `${preferredTenderTypes.length} odabrane vrste tendera`
                      : "Odaberite robe, usluge i/ili radove"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    Klikni za uređivanje
                  </span>
                  <ChevronDown className={cn("size-4 text-slate-600 transition-transform", expandedSection === "tender-types" ? "rotate-180" : "rotate-0")} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preferredTenderTypes.length > 0 ? preferredTenderTypes.map((item) => (
                  <Badge key={item} variant="outline" className="border-emerald-100 bg-emerald-50 text-emerald-700">
                    {getProfileOptionLabel(item)}
                  </Badge>
                )) : (
                  <Badge variant="outline" className="bg-white text-slate-500">
                    Nije odabrano
                  </Badge>
                )}
              </div>
            </button>
          </div>

          {expandedSection === "offering" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
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
                    <div key={group.id} className="rounded-2xl border border-slate-200 bg-white p-5">
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
                                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
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

                {specializationSections.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4">
                      <Label className="text-base font-bold text-slate-900">Preciznije usmjerite preporuke prema onome što zaista nudite</Label>
                      <p className="mt-1 text-sm text-slate-500">
                        Ovi izbori služe kao smjer za preporuke i analizu tržišta. Ne zaključavaju vas tvrdo na usku nišu, nego pomažu da sistem bolje razumije vaš stvarni poslovni fokus.
                      </p>
                    </div>
                    <div className="space-y-5">
                      {specializationSections.map((section) => (
                        <div key={section.categoryId} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
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
                                      ? "border-amber-200 bg-amber-50/80 shadow-sm"
                                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                                      <p className="mt-2 text-sm leading-6 text-slate-500">{option.description}</p>
                                    </div>
                                    {selected ? <Check className="mt-0.5 size-4 text-amber-700" /> : null}
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

          {expandedSection === "tender-types" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="mb-4">
                <Label className="text-base font-bold text-slate-900">Koje vrste tendera želite pratiti</Label>
                <p className="mt-1 text-sm text-slate-500">
                  Ovo određuje da li vam prvo prikazujemo robe, usluge, radove ili kombinaciju.
                </p>
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
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
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
            </div>
          ) : null}

          <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
            <div className="space-y-2">
              <Label className="text-purple-900 font-bold">Automatska priprema profila</Label>
              <p className="text-xs text-slate-500 mb-2">
                Upišite čime se firma bavi. Sistem će u pozadini doraditi preporuke i predložiti dodatne CPV kodove.
              </p>
              <Textarea 
                placeholder="Npr. Izvodimo elektroinstalacione radove, održavamo javnu rasvjetu i isporučujemo kabel, razvodne ormare i prateću opremu..." 
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
                Dopuni profil i CPV kodove
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vaši dodatni pojmovi</Label>
              <p className="text-xs text-slate-500">
                Ovdje vidite samo pojmove koje ste vi ručno unijeli. Sistemski pojmovi ostaju skriveni u pozadini.
              </p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Dodaj pojam koji želite pratiti..." 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={addKeyword}
                  className="max-w-xs"
                />
                <Button size="icon" variant="outline" onClick={() => {
                  if (newKeyword.trim()) {
                    setManualKeywords(sanitizeSearchKeywords([...manualKeywords, newKeyword.trim()]));
                    setNewKeyword("");
                  }
                }}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[44px]">
                {manualKeywords.length === 0 && <span className="text-xs text-slate-400 italic">Nema ručno unesenih pojmova</span>}
                {manualKeywords.map(k => (
                  <Badge key={k} variant="outline" className="bg-white border-slate-200 text-slate-700 gap-1 pr-1">
                    {k}
                    <button onClick={() => removeTag(manualKeywords, setManualKeywords, k)} className="hover:text-red-500"><X className="size-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>CPV Kodovi</Label>
              <p className="text-xs text-slate-500">
                Ovdje su svi trenutno dodijeljeni CPV kodovi. Možete dodati i svoje dodatne kodove.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Dodaj CPV kod, npr. 48000000-8"
                  value={newCpvCode}
                  onChange={(e) => setNewCpvCode(e.target.value)}
                  onKeyDown={addCpvCode}
                  className="max-w-xs"
                />
                <Button size="icon" variant="outline" onClick={() => addCpvCode()}>
                  <Plus className="size-4" />
                </Button>
              </div>
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
              <p className="text-xs text-slate-500">
                Možete označiti cijeli kanton ili samo pojedine gradove i općine.
              </p>
              <RegionMultiSelect selectedRegions={regions} onChange={setRegions} />
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[44px]">
                {regionSelectionLabels.length === 0 && <span className="text-xs text-slate-400 italic">Cijela BiH</span>}
                {regionSelectionLabels.map(r => (
                  <Badge key={r} variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 gap-1 pr-1">
                    {r}
                    <button onClick={() => removeRegionLabel(r)} className="hover:text-red-500"><X className="size-3" /></button>
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
