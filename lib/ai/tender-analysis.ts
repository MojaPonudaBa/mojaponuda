import { getOpenAIClient } from "@/lib/openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeGeoEnrichmentIntoAiAnalysis } from "@/lib/tender-area";
import type { Tender, Json } from "@/types/database";

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini sa dubokim poznavanjem Zakona o javnim nabavkama BiH (Službeni glasnik BiH, br. 39/14).

Tvoj zadatak je analizirati tender dokumentaciju i identifikovati:
1. Sve dokumentacijske zahtjeve koje ponuđač mora ispuniti
2. Rokove koji su relevantni za pripremu ponude
3. Uslove kvalifikacije i podobnosti
4. Rizike koji mogu dovesti do diskvalifikacije ponude

Za svaki dokumentacijski zahtjev, klasificiraj ga u jedan od sljedećih tipova:
- registration: rješenje o registraciji, izvod iz sudskog registra
- tax: porezna uvjerenja, uvjerenje o izmirenim porezima
- contributions: uvjerenja o izmirenim doprinosima za zaposlene
- guarantee: bankarska garancija, garancija za ozbiljnost ponude
- reference: lista referenci, potvrde o uspješno izvršenim ugovorima
- financial: bilans stanja, bilans uspjeha, finansijski izvještaji
- staff: CV-ovi ključnog osoblja, diplome, certifikati
- license: dozvole za obavljanje djelatnosti, posebne licence
- declaration: izjave (npr. o nekažnjavanju, o ekonomskoj i finansijskoj sposobnosti)
- form: obrasci i aneksi iz tenderske dokumentacije koje ponuđač mora popuniti i priložiti (npr. Aneks 1, Obrazac za cijenu, Obrazac ponude, Obrazac izjave, tabelarni pregledi za popunjavanje)
- other: ostali dokumenti koji ne spadaju u gornje kategorije

VAŽNO: Obrati posebnu pažnju na ANEKSE i OBRASCE koji su sastavni dio tenderske dokumentacije. Ovi dokumenti se obično nalaze na kraju TD i ponuđač ih mora popuniti, potpisati i ovjeriti. Svaki aneks/obrazac treba biti zasebna stavka u listi.

Budi precizan i detaljan. Ako tekst tendera ne sadrži dovoljno informacija za određeni zahtjev, označi ga kao rizik. Uvijek pretpostavi najstroži mogući zahtjev prema Zakonu o javnim nabavkama BiH.

Odgovori ISKLJUČIVO u traženom JSON formatu.`;

export interface AnalysisChecklistItem {
  name: string;
  description: string;
  document_type:
    | "registration"
    | "tax"
    | "contributions"
    | "guarantee"
    | "reference"
    | "financial"
    | "staff"
    | "license"
    | "declaration"
    | "form"
    | "other";
  is_required: boolean;
  risk_note: string | null;
}

export interface AnalysisDeadline {
  label: string;
  date: string;
}

export interface AnalysisResult {
  checklist_items: AnalysisChecklistItem[];
  deadlines: AnalysisDeadline[];
  eligibility_conditions: string[];
  risk_flags: string[];
}

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "tender_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        checklist_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Naziv stavke" },
              description: {
                type: "string",
                description: "Detaljan opis šta je potrebno pripremiti",
              },
              document_type: {
                type: "string",
                enum: [
                  "registration",
                  "tax",
                  "contributions",
                  "guarantee",
                  "reference",
                  "financial",
                  "staff",
                  "license",
                  "declaration",
                  "form",
                  "other",
                ],
              },
              is_required: {
                type: "boolean",
                description: "Da li je stavka obavezna",
              },
              risk_note: {
                type: ["string", "null"],
                description: "Napomena o riziku ako postoji, inače null",
              },
            },
            required: [
              "name",
              "description",
              "document_type",
              "is_required",
              "risk_note",
            ],
            additionalProperties: false,
          },
        },
        deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              date: {
                type: "string",
                description: "Datum u formatu YYYY-MM-DD ili opis",
              },
            },
            required: ["label", "date"],
            additionalProperties: false,
          },
        },
        eligibility_conditions: {
          type: "array",
          items: { type: "string" },
          description: "Uslovi kvalifikacije i podobnosti",
        },
        risk_flags: {
          type: "array",
          items: { type: "string" },
          description: "Ozbiljni rizici koji mogu dovesti do diskvalifikacije",
        },
      },
      required: [
        "checklist_items",
        "deadlines",
        "eligibility_conditions",
        "risk_flags",
      ],
      additionalProperties: false,
    },
  },
};

function isPlainObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractCachedTenderAnalysis(aiAnalysis: Json | null | undefined): AnalysisResult | null {
  if (!isPlainObject(aiAnalysis)) {
    return null;
  }

  const nested = aiAnalysis.tender_analysis;
  const candidate = isPlainObject(nested) ? nested : aiAnalysis;

  if (
    Array.isArray(candidate.checklist_items) &&
    Array.isArray(candidate.deadlines) &&
    Array.isArray(candidate.eligibility_conditions) &&
    Array.isArray(candidate.risk_flags)
  ) {
    return candidate as unknown as AnalysisResult;
  }

  return null;
}

export async function analyzeTender(tender: Tender): Promise<AnalysisResult> {
  const cached = extractCachedTenderAnalysis(tender.ai_analysis);
  if (cached?.checklist_items.length) {
    return cached;
  }

  const tenderText = [
    `Naziv tendera: ${tender.title}`,
    tender.contracting_authority
      ? `Naručilac: ${tender.contracting_authority}`
      : null,
    tender.contract_type ? `Tip ugovora: ${tender.contract_type}` : null,
    tender.procedure_type ? `Procedura: ${tender.procedure_type}` : null,
    tender.estimated_value
      ? `Procijenjena vrijednost: ${tender.estimated_value} KM`
      : null,
    tender.deadline
      ? `Rok za ponude: ${new Date(tender.deadline).toLocaleDateString("bs-BA")}`
      : null,
    tender.raw_description
      ? `\nOpis tendera:\n${tender.raw_description}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analiziraj sljedeći tender i vrati strukturiranu analizu:\n\n${tenderText}`,
      },
    ],
    response_format: RESPONSE_SCHEMA,
    temperature: 0.2,
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("AI nije vratio odgovor.");
  }

  const analysis: AnalysisResult = JSON.parse(rawContent);

  try {
    const supabaseAdmin = createAdminClient();
    const mergedAiAnalysis = mergeGeoEnrichmentIntoAiAnalysis(tender.ai_analysis, null);
    const nextAiAnalysis = isPlainObject(mergedAiAnalysis)
      ? ({ ...mergedAiAnalysis, tender_analysis: analysis as unknown as Json } as Json)
      : ({ tender_analysis: analysis as unknown as Json } as Json);
    const { error: cacheError } = await supabaseAdmin
      .from("tenders")
      .update({ ai_analysis: nextAiAnalysis })
      .eq("id", tender.id);

    if (cacheError) {
      console.error("Tender AI cache save error:", cacheError.message);
    }
  } catch (error) {
    console.error("Tender AI cache save error:", error);
  }

  return analysis;
}
