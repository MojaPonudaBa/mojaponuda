import { BIH_REGION_GROUPS } from "@/lib/constants/regions";
import { getOpenAIClient } from "@/lib/openai";
import type { Json } from "@/types/database";

export interface TenderAreaContext {
  title?: string | null;
  raw_description?: string | null;
  contracting_authority?: string | null;
  authority_city?: string | null;
  authority_municipality?: string | null;
  authority_canton?: string | null;
  authority_entity?: string | null;
}

export interface TenderAreaEnrichment {
  area_label: string | null;
  municipality: string | null;
  canton: string | null;
  entity: string | null;
  source: "authority_registry" | "tender_text" | "ai_hint";
  confidence: number | null;
  matched_text: string | null;
  ai_reason: string | null;
  updated_at: string;
}

interface MunicipalityEntry {
  municipality: string;
  normalizedMunicipality: string;
  canton: string | null;
  entity: string | null;
}

interface CantonEntry {
  canton: string;
  normalizedCanton: string;
  entity: string | null;
}

interface TenderAreaHintResponse {
  location_text?: string | null;
  confidence?: number | null;
  reason?: string | null;
}

const FEDERATION_ENTITY = "Federacija Bosne i Hercegovine";
const BRCKO_ENTITY = "Brčko distrikt";
const RS_ENTITY = "Republika Srpska";
const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "đ",
  е: "e",
  ж: "ž",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "ć",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "č",
  џ: "dž",
  ш: "š",
  А: "a",
  Б: "b",
  В: "v",
  Г: "g",
  Д: "d",
  Ђ: "đ",
  Е: "e",
  Ж: "ž",
  З: "z",
  И: "i",
  Ј: "j",
  К: "k",
  Л: "l",
  Љ: "lj",
  М: "m",
  Н: "n",
  Њ: "nj",
  О: "o",
  П: "p",
  Р: "r",
  С: "s",
  Т: "t",
  Ћ: "ć",
  У: "u",
  Ф: "f",
  Х: "h",
  Ц: "c",
  Ч: "č",
  Џ: "dž",
  Ш: "š",
};

const municipalityEntries: MunicipalityEntry[] = BIH_REGION_GROUPS.flatMap((group) => {
  const entity = deriveEntity(group.parentRegion ?? group.label);
  const canton = group.parentRegion ?? null;

  return group.municipalities.map((municipality) => ({
    municipality,
    normalizedMunicipality: normalizeGeoText(municipality),
    canton,
    entity,
  }));
});

const cantonEntries: CantonEntry[] = BIH_REGION_GROUPS.map((group) => ({
  canton: group.parentRegion ?? group.label,
  normalizedCanton: normalizeGeoText(group.parentRegion ?? group.label),
  entity: deriveEntity(group.parentRegion ?? group.label),
}));

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "tender_area_hint",
    strict: true,
    schema: {
      type: "object",
      properties: {
        location_text: {
          type: ["string", "null"],
        },
        confidence: {
          type: ["number", "null"],
        },
        reason: {
          type: ["string", "null"],
        },
      },
      required: ["location_text", "confidence", "reason"],
      additionalProperties: false,
    },
  },
};

function deriveEntity(regionLabel: string): string {
  if (regionLabel === "Brčko distrikt") {
    return BRCKO_ENTITY;
  }

  if (regionLabel.startsWith("Republika Srpska")) {
    return RS_ENTITY;
  }

  return FEDERATION_ENTITY;
}

function transliterateBosnianCyrillic(value: string): string {
  return [...value]
    .map((character) => CYRILLIC_TO_LATIN_MAP[character] ?? character)
    .join("");
}

export function normalizeGeoText(value: string | null | undefined): string {
  return transliterateBosnianCyrillic(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickAreaLabel(
  municipality: string | null,
  city: string | null,
  canton: string | null,
  entity: string | null
): string | null {
  return municipality ?? city ?? canton ?? entity ?? null;
}

function clampConfidence(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseGeoEnrichment(value: Json | undefined): TenderAreaEnrichment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const maybe = value as Record<string, Json | undefined>;

  return {
    area_label: typeof maybe.area_label === "string" ? maybe.area_label : null,
    municipality: typeof maybe.municipality === "string" ? maybe.municipality : null,
    canton: typeof maybe.canton === "string" ? maybe.canton : null,
    entity: typeof maybe.entity === "string" ? maybe.entity : null,
    source:
      maybe.source === "authority_registry" || maybe.source === "tender_text" || maybe.source === "ai_hint"
        ? maybe.source
        : "tender_text",
    confidence: typeof maybe.confidence === "number" ? clampConfidence(maybe.confidence) : null,
    matched_text: typeof maybe.matched_text === "string" ? maybe.matched_text : null,
    ai_reason: typeof maybe.ai_reason === "string" ? maybe.ai_reason : null,
    updated_at: typeof maybe.updated_at === "string" ? maybe.updated_at : new Date().toISOString(),
  };
}

function scoreMunicipalityMatch(fieldValue: string, entry: MunicipalityEntry): number {
  if (!fieldValue.includes(entry.normalizedMunicipality)) {
    return 0;
  }

  return entry.normalizedMunicipality.split(" ").length >= 2 ? 2 : 1;
}

function resolveFromTextFields(
  fields: Array<{ text: string | null | undefined; weight: number }>,
  source: TenderAreaEnrichment["source"]
): TenderAreaEnrichment | null {
  const bestMunicipalityScores = new Map<string, { entry: MunicipalityEntry; score: number }>();
  const bestCantonScores = new Map<string, { entry: CantonEntry; score: number }>();

  for (const field of fields) {
    const normalizedField = normalizeGeoText(field.text);

    if (!normalizedField) {
      continue;
    }

    for (const entry of municipalityEntries) {
      const matchScore = scoreMunicipalityMatch(normalizedField, entry);
      if (matchScore === 0) {
        continue;
      }

      const score = matchScore * field.weight;
      const current = bestMunicipalityScores.get(entry.municipality);
      if (!current || score > current.score) {
        bestMunicipalityScores.set(entry.municipality, { entry, score });
      }
    }

    for (const entry of cantonEntries) {
      if (!normalizedField.includes(entry.normalizedCanton)) {
        continue;
      }

      const score = field.weight;
      const current = bestCantonScores.get(entry.canton);
      if (!current || score > current.score) {
        bestCantonScores.set(entry.canton, { entry, score });
      }
    }
  }

  const bestMunicipality = [...bestMunicipalityScores.values()].sort((a, b) => b.score - a.score)[0];
  if (bestMunicipality) {
    return {
      area_label: bestMunicipality.entry.municipality,
      municipality: bestMunicipality.entry.municipality,
      canton: bestMunicipality.entry.canton,
      entity: bestMunicipality.entry.entity,
      source,
      confidence: clampConfidence(0.55 + bestMunicipality.score / 24),
      matched_text: bestMunicipality.entry.municipality,
      ai_reason: null,
      updated_at: new Date().toISOString(),
    };
  }

  const bestCanton = [...bestCantonScores.values()].sort((a, b) => b.score - a.score)[0];
  if (bestCanton) {
    return {
      area_label: bestCanton.entry.canton,
      municipality: null,
      canton: bestCanton.entry.canton,
      entity: bestCanton.entry.entity,
      source,
      confidence: clampConfidence(0.5 + bestCanton.score / 20),
      matched_text: bestCanton.entry.canton,
      ai_reason: null,
      updated_at: new Date().toISOString(),
    };
  }

  return null;
}

export function getGeoEnrichmentFromAiAnalysis(
  aiAnalysis: Json | null | undefined
): TenderAreaEnrichment | null {
  if (!isJsonObject(aiAnalysis)) {
    return null;
  }

  return parseGeoEnrichment(aiAnalysis.geo_enrichment);
}

export function mergeGeoEnrichmentIntoAiAnalysis(
  aiAnalysis: Json | null | undefined,
  geoEnrichment: TenderAreaEnrichment | null
): Json | null {
  if (!geoEnrichment) {
    return aiAnalysis ?? null;
  }

  const base = isJsonObject(aiAnalysis) ? { ...aiAnalysis } : {};
  base.geo_enrichment = geoEnrichment as unknown as Json;
  return base as Json;
}

export function resolveTenderAreaFromAuthority(context: TenderAreaContext): TenderAreaEnrichment | null {
  const directLabel = pickAreaLabel(
    context.authority_municipality ?? null,
    context.authority_city ?? null,
    context.authority_canton ?? null,
    context.authority_entity ?? null
  );

  const textResolution = resolveFromTextFields(
    [
      { text: context.authority_municipality, weight: 12 },
      { text: context.authority_city, weight: 10 },
      { text: context.authority_canton, weight: 8 },
      { text: context.authority_entity, weight: 6 },
      { text: context.contracting_authority, weight: 9 },
    ],
    "authority_registry"
  );

  if (textResolution) {
    return {
      ...textResolution,
      area_label: directLabel ?? textResolution.area_label,
    };
  }

  if (!directLabel) {
    return null;
  }

  return {
    area_label: directLabel,
    municipality: context.authority_municipality ?? context.authority_city ?? null,
    canton: context.authority_canton ?? null,
    entity: context.authority_entity ?? null,
    source: "authority_registry",
    confidence: 0.7,
    matched_text: directLabel,
    ai_reason: null,
    updated_at: new Date().toISOString(),
  };
}

export function resolveTenderAreaFromText(context: TenderAreaContext): TenderAreaEnrichment | null {
  return resolveFromTextFields(
    [
      { text: context.contracting_authority, weight: 9 },
      { text: context.title, weight: 8 },
      { text: context.raw_description, weight: 5 },
    ],
    "tender_text"
  );
}

export async function resolveTenderAreaWithAiHint(
  context: TenderAreaContext
): Promise<TenderAreaEnrichment | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const tenderText = [
    context.contracting_authority ? `Naručilac: ${context.contracting_authority}` : null,
    context.title ? `Naziv tendera: ${context.title}` : null,
    context.raw_description ? `Opis: ${context.raw_description.slice(0, 2000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (!tenderText.trim()) {
    return null;
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Izdvoji samo eksplicitno navedenu ili vrlo snažno impliciranu lokaciju tendera u Bosni i Hercegovini. Kao lokaciju možeš vratiti i sjedište ugovornog organa ako je ono jasno prepoznatljivo iz samog naziva institucije ili iz teksta tendera. Ako nema dovoljno osnova ili nisi visoko siguran, vrati null. Ne izmišljaj grad, općinu, kanton ni entitet.",
        },
        {
          role: "user",
          content: tenderText,
        },
      ],
      response_format: RESPONSE_SCHEMA,
      temperature: 0,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return null;
    }

    const parsed = JSON.parse(rawContent) as TenderAreaHintResponse;
    const locationText = typeof parsed.location_text === "string" ? parsed.location_text.trim() : "";
    if (!locationText) {
      return null;
    }

    const hintResolution = resolveFromTextFields(
      [{ text: locationText, weight: 12 }],
      "ai_hint"
    );

    if (!hintResolution) {
      return null;
    }

    return {
      ...hintResolution,
      confidence: clampConfidence(parsed.confidence ?? hintResolution.confidence),
      matched_text: locationText,
      ai_reason: typeof parsed.reason === "string" ? parsed.reason : null,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Tender area AI hint error:", error);
    return null;
  }
}

export function resolveBestTenderArea(
  context: TenderAreaContext,
  existingGeo: TenderAreaEnrichment | null
): TenderAreaEnrichment | null {
  if (existingGeo?.area_label) {
    return existingGeo;
  }

  return resolveTenderAreaFromAuthority(context) ?? resolveTenderAreaFromText(context);
}
