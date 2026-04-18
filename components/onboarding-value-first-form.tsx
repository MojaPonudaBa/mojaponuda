"use client";

import { useEffect, useMemo, useState } from "react";
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
  getCategorySpecializationOptions,
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
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Lock,
} from "lucide-react";

interface OnboardingValueFirstFormProps {
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

interface PreviewTender {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  match_badge: string;
  area_badge: string | null;
  match_reason: string;
  area_label: string | null;
}

const STEPS = [
  {
    id: "focus",
    title: "Čime se bavite",
    description: "Odaberite šta vaša firma stvarno radi. U sljedećem koraku dodajemo kontekst koji AI koristi za preporuke.",
    icon: Brain,
    completionLabel: "Korak 1 / 4",
  },
  {
    id: "profile",
    title: "Recite nam više o svojoj firmi",
    description: "Što više kažete, to preciznije preporuke. AI čita sve ovo i pronalazi tendere koji stvarno odgovaraju vašem poslu.",
    icon: Target,
    completionLabel: "Korak 2 / 4",
  },
  {
    id: "preview",
    title: "Prvi pregled tendera",
    description: "Na osnovu profila koji smo upravo izgradili, AI je već odabrao tendere koji najbolje odgovaraju vašoj firmi.",
    icon: Search,
    completionLabel: "Korak 3 / 4",
  },
  {
    id: "company",
    title: "Završite profil firme",
    description: "Na kraju upisujete podatke firme kako bismo sačuvali profil i otvorili vaš dashboard bez ponovnog unosa.",
    icon: Building2,
    completionLabel: "Korak 4 / 4",
  },
] as const;

function formatCompactCurrency(value: number | null | undefined): string {
  if (!value) return "Vrijednost nije objavljena";
  return new Intl.NumberFormat("bs-BA", {
    compactDisplay: "short",
    notation: "compact",
    style: "currency",
    currency: "BAM",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Rok nije objavljen";
  return new Date(value).toLocaleDateString("bs-BA");
}

export function OnboardingValueFirstForm({
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
}: OnboardingValueFirstFormProps) {
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
  const [specializationIds, setSpecializationIds] = useState<string[]>(parsedProfile.specializationIds ?? []);
  const [preferredTenderTypes, setPreferredTenderTypes] = useState<string[]>(parsedProfile.preferredTenderTypes);
  const [regions, setRegions] = useState<string[]>(initialRegions);
  const [description, setDescription] = useState(
    parsedProfile.companyDescription ?? parsedProfile.legacyIndustryText ?? ""
  );
  const [pastClients, setPastClients] = useState("");
  const [licenses, setLicenses] = useState("");
  const [notOffered, setNotOffered] = useState("");
  const [embeddingSaving, setEmbeddingSaving] = useState(false);
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);
  // When the user has no company row yet (typical first onboarding), the
  // save-embedding endpoint cannot INSERT (companies.name/jib are NOT NULL).
  // In that case it returns the computed values here so handleSubmit can
  // include them in the final INSERT payload.
  const [deferredProfileText, setDeferredProfileText] = useState<string | null>(null);
  const [deferredProfileEmbedding, setDeferredProfileEmbedding] = useState<string | null>(null);
  const [previewTenders, setPreviewTenders] = useState<PreviewTender[]>([]);
  const [previewSummary, setPreviewSummary] = useState(
    "Nakon osnovnog unosa ovdje ćete odmah vidjeti prve tendere koji odgovaraju vašoj firmi i njenoj lokaciji."
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Završavam profil...");

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
  const previewRequestKey = useMemo(
    () => JSON.stringify({
      offeringCategories: [...offeringCategories].sort(),
      specializationIds: [...specializationIds].sort(),
      preferredTenderTypes: [...preferredTenderTypes].sort(),
      regions: [...regions].sort(),
    }),
    [offeringCategories, specializationIds, preferredTenderTypes, regions]
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
    if (targetStep === 0 && offeringCategories.length === 0) {
      return "Odaberite barem jednu stvar koju vaša firma stvarno radi.";
    }

    if (targetStep === 1) {
      if (description.trim().length < 10) {
        return "Opišite čime se vaša firma bavi (barem 10 karaktera, 2–5 rečenica).";
      }
    }

    if (targetStep === 3) {
      if (!name.trim()) return "Unesite puni naziv firme.";
      if (jib.trim().length < 12) return "JIB mora imati najmanje 12 cifara.";
    }

    return null;
  }

  async function saveProfileEmbedding(): Promise<{ ok: boolean; error?: string }> {
    setEmbeddingSaving(true);
    setEmbeddingError(null);
    try {
      const categoryText = offeringCategories
        .map((id) => getProfileOptionLabel(id))
        .filter(Boolean)
        .join(", ");
      const response = await fetch("/api/onboarding/save-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          pastClients: pastClients.trim() || null,
          licenses: licenses.trim() || null,
          notOffered: notOffered.trim() || null,
          regionsText: regionSelectionLabels.join(", ") || null,
          categoryText: categoryText || null,
          companyId: companyId || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg =
          [data?.error, data?.detail].filter(Boolean).join(" — ") ||
          `Nismo uspjeli spremiti profil (HTTP ${response.status}).`;
        setEmbeddingError(msg);
        console.error("saveProfileEmbedding response:", response.status, data);
        return { ok: false, error: msg };
      }
      if (data?.deferred && data?.profileEmbedding) {
        setDeferredProfileText(data.profileText ?? null);
        setDeferredProfileEmbedding(data.profileEmbedding);
      } else {
        setDeferredProfileText(null);
        setDeferredProfileEmbedding(null);
      }
      return { ok: true };
    } catch (err) {
      const msg = `Greška pri kontaktu sa serverom: ${err instanceof Error ? err.message : String(err)}`;
      console.error("saveProfileEmbedding error:", err);
      setEmbeddingError(msg);
      return { ok: false, error: msg };
    } finally {
      setEmbeddingSaving(false);
    }
  }

  async function loadPreview() {
    if (offeringCategories.length === 0) {
      setPreviewTenders([]);
      setPreviewSummary("Odaberite barem jednu djelatnost da pokažemo prve tendere.");
      setPreviewError(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    const descriptionFallback = [
      derivedPrimaryIndustry ? `Fokus firme je ${getProfileOptionLabel(derivedPrimaryIndustry)}.` : null,
      offeringCategories.length > 0
        ? `Firma nudi ${offeringCategories.map((item) => getProfileOptionLabel(item)).join(", ")}.`
        : null,
      preferredTenderTypes.length > 0
        ? `Najviše prati tendere za ${preferredTenderTypes.map((item) => getProfileOptionLabel(item)).join(", ")}.`
        : null,
      regionSelectionLabels.length > 0
        ? `Firma se nalazi ili ima poslovnicu u: ${regionSelectionLabels.join(", ")}.`
        : "Lokacija firme nije sužena, pa se vide prilike sa nivoa cijele Bosne i Hercegovine.",
    ]
      .filter((item): item is string => Boolean(item))
      .join(" ");

    const effectivePreviewDescription = description.trim() || descriptionFallback;

    try {
      const response = await fetch("/api/onboarding/preview-tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringCategories,
          specializationIds,
          preferredTenderTypes,
          regions,
          description: effectivePreviewDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nismo uspjeli pripremiti pregled tendera.");
      }

      setPreviewTenders(data.tenders || []);
      setPreviewSummary(
        data.summary ||
          "Na osnovu osnovnih podataka pripremili smo početni pregled tendera za vašu firmu."
      );
      setPreviewKey(previewRequestKey);
    } catch (previewLoadError) {
      console.error("Onboarding preview error:", previewLoadError);
      setPreviewError("Početni pregled trenutno nije dostupan. Nastavite dalje i završite profil.");
      setPreviewTenders([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (step === 2 && previewKey !== previewRequestKey) {
      void loadPreview();
    }
  }, [step, previewKey, previewRequestKey]);

  async function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Before moving from questionnaire (step 1) into preview (step 2),
    // compute and persist profile_embedding so the recommendation pipeline
    // can query with it. This is required by the new architecture.
    if (step === 1) {
      const result = await saveProfileEmbedding();
      if (!result.ok) {
        setError(result.error ?? "Nismo uspjeli spremiti profil. Pokušajte ponovo.");
        return;
      }
    }

    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateStep(0) || validateStep(3);
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

    const descriptionFallback = [
      derivedPrimaryIndustry ? `Fokus firme je ${getProfileOptionLabel(derivedPrimaryIndustry)}.` : null,
      offeringCategories.length > 0
        ? `Firma nudi ${offeringCategories.map((item) => getProfileOptionLabel(item)).join(", ")}.`
        : null,
      preferredTenderTypes.length > 0
        ? `Najviše prati tendere za ${preferredTenderTypes.map((item) => getProfileOptionLabel(item)).join(", ")}.`
        : null,
      regionSelectionLabels.length > 0
        ? `Firma se nalazi ili ima poslovnicu u: ${regionSelectionLabels.join(", ")}.`
        : "Lokacija firme nije sužena, pa se vide prilike sa nivoa cijele Bosne i Hercegovine.",
    ]
      .filter((item): item is string => Boolean(item))
      .join(" ");

    const effectiveDescription = description.trim() || descriptionFallback;

    const profileContext = buildProfileContextText({
      description: effectiveDescription,
      primaryIndustry: derivedPrimaryIndustry,
      offeringCategories,
      specializationIds,
      preferredTenderTypes,
      regions: regionSelectionLabels,
    });

    const profileSeeds = buildProfileKeywordSeeds({
      primaryIndustry: derivedPrimaryIndustry,
      offeringCategories,
      specializationIds,
      preferredTenderTypes,
      companyDescription: effectiveDescription,
      legacyIndustryText: null,
    });

    let generatedCpv = initialCpvCodes;
    let generatedKeywords = initialKeywords;
    let enrichmentData: { core_keywords: string[]; broad_keywords: string[]; cpv_codes: string[]; negative_keywords: string[] } | null = null;

    try {
      const res = await fetch("/api/onboarding/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: effectiveDescription,
          primaryIndustry: derivedPrimaryIndustry,
          offeringCategories,
          specializationIds,
          preferredTenderTypes,
          regions: regionSelectionLabels,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        generatedCpv = data.cpv_codes || [];
        generatedKeywords = data.keywords || [];
        if (data.enrichment) {
          enrichmentData = data.enrichment;
        }
      }
    } catch (generationError) {
      console.error("Onboarding profile generation error:", generationError);
    }

    const keywords = sanitizeSearchKeywords([
      ...initialKeywords,
      ...generatedKeywords,
      ...profileSeeds,
    ]);

    const payload: Record<string, unknown> = {
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
          specializationIds,
          preferredTenderTypes,
          companyDescription: effectiveDescription,
          legacyIndustryText: null,
          ...(enrichmentData ? {
            aiCoreKeywords: enrichmentData.core_keywords,
            aiBroadKeywords: enrichmentData.broad_keywords,
            aiCpvCodes: enrichmentData.cpv_codes,
            aiNegativeKeywords: enrichmentData.negative_keywords,
            aiEnrichedAt: new Date().toISOString(),
          } : {}),
        }) ?? profileContext,
      cpv_codes: generatedCpv,
      keywords,
      operating_regions: regions,
    };

    if (deferredProfileEmbedding) {
      payload.profile_text = deferredProfileText;
      payload.profile_embedding = deferredProfileEmbedding;
      payload.profile_embedded_at = new Date().toISOString();
    }

    setLoadingText("Spremam profil i otvaram vaš pregled tendera...");

    let savedCompanyId = companyId;
    let saveError: { message: string } | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;
    if (companyId) {
      const { error: updateError } = await supabaseAny.from("companies").update(payload).eq("id", companyId);
      saveError = updateError;
    } else {
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingCompany?.id) {
        savedCompanyId = existingCompany.id;
        const { error: updateError } = await supabaseAny
          .from("companies")
          .update(payload)
          .eq("id", existingCompany.id);
        saveError = updateError;
      } else {
        const { data: insertedCompany, error: insertError } = await supabaseAny
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Korak {step + 1} od {STEPS.length}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">{currentStep.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{currentStep.description}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Napredak</p>
            <p className="mt-2 font-heading text-3xl font-bold text-slate-950">{currentStep.completionLabel}</p>
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
                <item.icon
                  className={cn(
                    "size-4",
                    index === step ? "text-blue-700" : index < step ? "text-emerald-700" : "text-slate-400"
                  )}
                />
                {index < step ? (
                  <Check className="size-4 text-emerald-700" />
                ) : (
                  <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {step === 0 ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">Za početak je dovoljno da odaberete šta radite i gdje se nalazite</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ne tražimo odmah JIB i sve podatke firme. Prvo želimo da vidite vrijednost i prve relevantne tendera koji su vam najbliži.
            </p>
          </div>

          <div className="space-y-5">
            {OFFERING_CATEGORY_GROUPS.map((group) => {
              const groupOptions = OFFERING_CATEGORY_OPTIONS.filter((option) => group.optionIds.includes(option.id));

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

        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <ShieldCheck className="mt-0.5 size-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Analiza završena</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{previewSummary}</p>
            </div>
          </div>

          {previewLoading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.5rem] border border-slate-200 bg-slate-50/70 text-center">
              <Loader2 className="size-8 animate-spin text-blue-600" />
              <p className="mt-4 text-sm font-semibold text-slate-900">Pripremamo prve preporuke tendera</p>
              <p className="mt-2 text-sm text-slate-500">Na osnovu djelatnosti i lokacije firme tražimo tendera koji liče na ono što radite i koji su vam najbliži.</p>
            </div>
          ) : previewError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              {previewError}
            </div>
          ) : previewTenders.length > 0 ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 text-center">
                <Sparkles className="mx-auto mb-3 size-6 text-blue-600" />
                <h3 className="text-xl font-bold text-slate-900">
                  Pronašli smo {previewTenders.length} {previewTenders.length === 1 ? "tender" : previewTenders.length >= 2 && previewTenders.length <= 4 ? "tendera" : "tendera"} za vašu firmu
                </h3>
                {previewTenders.reduce((acc, t) => acc + (t.estimated_value || 0), 0) > 0 && (
                  <p className="mt-2 text-base text-slate-600">
                    Ukupna procijenjena vrijednost: <span className="font-bold text-slate-900">{formatCompactCurrency(previewTenders.reduce((acc, t) => acc + (t.estimated_value || 0), 0))}</span>
                  </p>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {previewTenders.map((tender, index) => (
                  <div key={tender.id} className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
                    <div className="absolute inset-0 z-10 flex cursor-not-allowed flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
                      <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                        <Lock className="size-4 text-slate-400" />
                        Zaključano
                      </span>
                    </div>
                    
                    <div className="flex items-start justify-between gap-3 opacity-60">
                      <div className="w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                            {tender.match_badge}
                          </span>
                          <div className="h-5 w-24 rounded bg-emerald-100 blur-sm" />
                        </div>
                        <h3 className="mt-3 text-base font-bold leading-6 text-slate-900 blur-sm select-none">
                          Tender #{index + 1} - {tender.match_badge.replace("Djelatnost: ", "") || "Javna nabavka"}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 opacity-60">{tender.match_reason}</p>
                    <p className="mt-2 text-sm text-slate-500 blur-sm select-none opacity-60">Javna ustanova Naručilac</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500 opacity-60">
                      <div className="h-4 w-24 rounded bg-slate-200 blur-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
              <p className="text-base font-semibold text-slate-900">Još nema dovoljno jasnih poklapanja</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Nastavite na sljedeći korak i dopunite profil. Tada ćemo preporuke izoštriti i prikazati još preciznije tendere.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-900">
              Čime se vaša firma točno bavi?
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading || embeddingSaving}
              placeholder="Npr: Bavimo se isporukom i instalacijom serverske i mrežne opreme. Prodajemo softverske licence i pružamo IT podršku javnim institucijama."
              className="min-h-[100px] rounded-2xl border-slate-200 bg-white"
            />
            <p className="text-xs text-slate-500">
              Opišite šta radite i za koga — 2 do 5 rečenica je sasvim dovoljno.
            </p>
          </div>

          <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Opciono — ali što više kažete, to bolji tenderi
            </p>

            <div className="space-y-2">
              <Label htmlFor="pastClients" className="text-sm font-semibold text-slate-700">
                Za koga ste do sada radili?
              </Label>
              <Input
                id="pastClients"
                value={pastClients}
                onChange={(event) => setPastClients(event.target.value)}
                disabled={loading || embeddingSaving}
                placeholder="Npr: Klinički centar, općine u FBiH, javna preduzeća"
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenses" className="text-sm font-semibold text-slate-700">
                Imate li posebne licence ili certifikate?
              </Label>
              <Input
                id="licenses"
                value={licenses}
                onChange={(event) => setLicenses(event.target.value)}
                disabled={loading || embeddingSaving}
                placeholder="Npr: ISO 9001, licenca MUP-a, vatrogasno ovlaštenje"
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notOffered" className="text-sm font-semibold text-slate-700">
                Što vaša firma ne radi i ne može isporučiti? (koje tendere ne želite vidjeti)
              </Label>
              <Input
                id="notOffered"
                value={notOffered}
                onChange={(event) => setNotOffered(event.target.value)}
                disabled={loading || embeddingSaving}
                placeholder="Npr: Ne izvodimo građevinske radove, ne isporučujemo hranu ni vozila"
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <MapPin className="size-4 text-blue-600" />
                <Label className="text-sm font-semibold">Na kojim područjima radite ili isporučujete?</Label>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Odaberite šire područje, gradove i općine gdje je firma ili poslovnica. Na osnovu toga prvo prikazujemo najbliže relevantne tendere.
              </p>
              <p className="text-xs leading-5 text-slate-500">
                Ako ništa ne odaberete, prikazivat ćemo prilike sa nivoa cijele BiH.
              </p>
              <RegionMultiSelect selectedRegions={regions} onChange={setRegions} />
            </div>
          </div>

          {embeddingSaving ? (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-800">
              <Loader2 className="size-4 animate-spin" />
              Spremam profil firme za AI preporuke...
            </div>
          ) : null}
        </div>
      ) : null}

      {false ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">Sada možemo biti još precizniji</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ovaj korak pojačava kvalitet preporuka. Nije tu da vas zaustavi, nego da preporuke tačnije znaju koje ugovore stvarno možete isporučiti.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Koje vrste tendera želite pratiti</p>
            <p className="mt-1 text-sm text-slate-500">Odaberite sve što vam je relevantno. Ako ništa ne odaberete, preporuke će koristiti širi pregled.</p>
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

          {specializationSections.length > 0 ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Preciznije usmjerite preporuke prema onome što zaista nudite</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ovo je opcionalno. Ovi izbori ne zaključavaju profil na usku nišu, nego pomažu da preporuke više naginju tenderima koji su bliži vašem stvarnom poslovnom fokusu.
                </p>
              </div>

              <div className="space-y-5">
                {specializationSections.map((section) => (
                  <div key={section.categoryId} className="rounded-2xl border border-slate-200 bg-white p-5">
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
                                ? "border-blue-200 bg-blue-50/80 shadow-sm"
                                : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
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
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Opišite firmu svojim riječima</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading}
              placeholder="Npr. Radimo softver, licence, servere, mreže i održavanje za javni sektor širom BiH. Imamo iskustvo u školama, općinama i javnim ustanovama..."
              className="min-h-[180px] rounded-2xl border-slate-200 bg-white"
            />
            <p className="text-xs text-slate-500">
              Ovaj korak je preporučen, ali nije obavezan. Dvije do pet konkretnih rečenica su dovoljne za mnogo preciznije preporuke.
            </p>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">Još samo podaci firme</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ovdje završavate profil kako bismo sačuvali preporuke, otvorili dashboard i kasnije pripremu ponude vezali za stvarnu firmu.
            </p>
          </div>

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

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-slate-900">Sažetak onoga što će preporuke koristiti</p>
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
              {specializationIds.map((item) => (
                <span key={item} className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
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
            disabled={
              loading ||
              embeddingSaving ||
              (step === 1 && description.trim().length < 10)
            }
            className="h-11 rounded-xl bg-slate-950 px-5 font-semibold text-white hover:bg-blue-700"
          >
            {embeddingSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Pripremam AI profil...
              </>
            ) : (
              <>
                {step === 1
                  ? "Dalje: Otključaj tendere za vašu firmu"
                  : "Nastavi"}
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {loading ? loadingText : "Sačuvaj profil i otvori dashboard"}
          </Button>
        )}
      </div>
    </form>
  );
}
