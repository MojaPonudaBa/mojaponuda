// ============================================================
// AI Document Analysis
// Analyzes tender documentation and extracts requirements
// ============================================================

import { getOpenAIClient } from "@/lib/openai";

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini sa dubokim poznavanjem Zakona o javnim nabavkama BiH.

Tvoj zadatak je analizirati PUNU tendersku dokumentaciju i ekstraktovati TAČNO SVE dokumentacijske zahtjeve koji se spominju.

KRITIČNO VAŽNO:
- Ekstraktuj SAMO ono što EKSPLICITNO piše u dokumentaciji
- NE dodavaj standardne dokumente ako nisu navedeni
- NE pretpostavljaj ništa
- Za svaki zahtjev OBAVEZNO navedi broj stranice gdje se spominje
- Ako se isti dokument spominje na više stranica, navedi sve stranice

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
- other: ostali dokumenti koji ne spadaju u gornje kategorije

Odgovori ISKLJUČIVO u traženom JSON formatu.`;

export interface DocumentRequirement {
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
    | "other";
  is_required: boolean;
  page_references: number[];
  source_quote: string;
  risk_note: string | null;
}

export interface DocumentAnalysisResult {
  requirements: DocumentRequirement[];
  deadlines: Array<{ label: string; date: string; page: number }>;
  eligibility_conditions: Array<{ condition: string; page: number }>;
  risk_flags: Array<{ flag: string; page: number }>;
  total_requirements_found: number;
}

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "document_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        requirements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Tačan naziv dokumenta kako piše u tenderskoj dokumentaciji",
              },
              description: {
                type: "string",
                description: "Detaljan opis zahtjeva iz dokumentacije",
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
                  "other",
                ],
              },
              is_required: {
                type: "boolean",
                description: "Da li je dokument obavezan",
              },
              page_references: {
                type: "array",
                items: { type: "number" },
                description: "Brojevi stranica gdje se dokument spominje",
              },
              source_quote: {
                type: "string",
                description: "Direktan citat iz dokumentacije koji opisuje zahtjev",
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
              "page_references",
              "source_quote",
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
              date: { type: "string" },
              page: { type: "number" },
            },
            required: ["label", "date", "page"],
            additionalProperties: false,
          },
        },
        eligibility_conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              condition: { type: "string" },
              page: { type: "number" },
            },
            required: ["condition", "page"],
            additionalProperties: false,
          },
        },
        risk_flags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              flag: { type: "string" },
              page: { type: "number" },
            },
            required: ["flag", "page"],
            additionalProperties: false,
          },
        },
        total_requirements_found: {
          type: "number",
          description: "Ukupan broj pronađenih zahtjeva",
        },
      },
      required: [
        "requirements",
        "deadlines",
        "eligibility_conditions",
        "risk_flags",
        "total_requirements_found",
      ],
      additionalProperties: false,
    },
  },
};

export async function analyzeDocumentation(
  documentText: string,
  tenderTitle: string,
  contractingAuthority: string | null
): Promise<DocumentAnalysisResult> {
  const openai = getOpenAIClient();

  const userPrompt = `Analiziraj sljedeću tendersku dokumentaciju i ekstraktuj SVE dokumentacijske zahtjeve:

Tender: ${tenderTitle}
${contractingAuthority ? `Naručilac: ${contractingAuthority}` : ""}

DOKUMENTACIJA:
${documentText}

VAŽNO: Ekstraktuj SAMO ono što EKSPLICITNO piše u dokumentaciji. Ne dodavaj standardne dokumente ako nisu navedeni.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: RESPONSE_SCHEMA,
    temperature: 0.1,
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("AI nije vratio odgovor.");
  }

  const analysis: DocumentAnalysisResult = JSON.parse(rawContent);
  return analysis;
}

// For large documents, analyze in chunks
export async function analyzeDocumentationInChunks(
  pages: Array<{ pageNumber: number; text: string }>,
  tenderTitle: string,
  contractingAuthority: string | null
): Promise<DocumentAnalysisResult> {
  const CHUNK_SIZE = 20; // Process 20 pages at a time
  const chunks: Array<Array<{ pageNumber: number; text: string }>> = [];

  for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
    chunks.push(pages.slice(i, i + CHUNK_SIZE));
  }

  const results: DocumentAnalysisResult[] = [];

  for (const chunk of chunks) {
    const chunkText = chunk
      .map((p) => `[Stranica ${p.pageNumber}]\n${p.text}`)
      .join("\n\n");

    const result = await analyzeDocumentation(
      chunkText,
      tenderTitle,
      contractingAuthority
    );
    results.push(result);
  }

  // Merge results
  const merged: DocumentAnalysisResult = {
    requirements: [],
    deadlines: [],
    eligibility_conditions: [],
    risk_flags: [],
    total_requirements_found: 0,
  };

  for (const result of results) {
    merged.requirements.push(...result.requirements);
    merged.deadlines.push(...result.deadlines);
    merged.eligibility_conditions.push(...result.eligibility_conditions);
    merged.risk_flags.push(...result.risk_flags);
  }

  // Deduplicate requirements by name
  const uniqueRequirements = new Map<string, DocumentRequirement>();
  for (const req of merged.requirements) {
    const existing = uniqueRequirements.get(req.name);
    if (existing) {
      // Merge page references
      existing.page_references = [
        ...new Set([...existing.page_references, ...req.page_references]),
      ].sort((a, b) => a - b);
    } else {
      uniqueRequirements.set(req.name, req);
    }
  }

  merged.requirements = Array.from(uniqueRequirements.values());
  merged.total_requirements_found = merged.requirements.length;

  return merged;
}
