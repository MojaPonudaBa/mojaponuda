import { getOpenAIClient } from "@/lib/openai";
import type { AnalysisChecklistItem, AnalysisDeadline, AnalysisResult } from "@/lib/ai/tender-analysis";

/**
 * Extended checklist item with page reference and source text
 * for tender-documentation-based analysis.
 */
export interface TenderDocChecklistItem extends AnalysisChecklistItem {
  page_reference: string | null;
  source_text: string | null;
}

export interface TenderDocAnalysisResult extends AnalysisResult {
  checklist_items: TenderDocChecklistItem[];
}

const SYSTEM_PROMPT = `Ti si ekspertni analitičar za javne nabavke u Bosni i Hercegovini. Specijaliziran si za detaljnu analizu tenderske dokumentacije (TD).

Tvoj zadatak je da iz PUNOG TEKSTA tenderske dokumentacije izvučeš TAČNU i KOMPLETNU listu dokumentacije koju ponuđač mora dostaviti.

PRAVILA:
1. Izvuci ISKLJUČIVO zahtjeve koji su eksplicitno navedeni u dokumentu — NEMOJ pretpostavljati, dodavati ili pogađati.
2. Za svaki zahtjev navedi tačnu stranicu (koristi oznake [Stranica X] iz teksta) i citiraj relevantan dio teksta.
3. Klasificiraj svaki zahtjev u odgovarajući tip dokumenta.
4. Označi da li je zahtjev obavezan ili opcioni.
5. Dodaj napomenu o riziku samo ako postoji konkretan uslov (npr. rok važenja, specifičan format, ovjera).
6. NE DODAJ ništa što nije eksplicitno traženo u dokumentu.
7. Svaki zahtjev MORA imati page_reference i source_text — ako ne možeš identificirati stranicu, napiši "Neidentificirana stranica".

Tipovi dokumenata:
- registration: rješenje o registraciji, izvod iz sudskog registra
- tax: porezna uvjerenja
- contributions: uvjerenja o doprinosima za zaposlene
- guarantee: bankarske garancije
- reference: reference projekata, potvrde o izvršenim ugovorima
- financial: bilans stanja, bilans uspjeha, finansijski izvještaji
- staff: CV-ovi, diplome, certifikati osoblja
- license: dozvole, licence, odobrenja
- declaration: izjave ponuđača (nekažnjavanje, sposobnost itd.)
- form: obrasci i aneksi iz tenderske dokumentacije koje ponuđač mora popuniti i priložiti (Aneks 1, Aneks 2, Obrazac za cijenu ponude, Obrazac ponude, Obrazac izjave, tabelarni pregledi itd.)
- other: sve ostalo

KRITIČNO VAŽNO — ANEKSI I OBRASCI:
Tenderska dokumentacija SKORO UVIJEK sadrži anekse/obrasce na kraju dokumenta. Ovo su predlošci/formulari koje ponuđač MORA popuniti, potpisati i priložiti uz ponudu. Traži sljedeće:
- Riječi: "Aneks", "Obrazac", "Prilog", "Formular", "Tabela za popunjavanje"
- Prepoznaj ih po karakterističnom formatu: prazan prostor za upis, linije za potpis, pečat
- Svaki aneks/obrazac MORA biti zasebna stavka u listi sa tipom "form"
- Navedi tačan naziv (npr. "Aneks 1 - Obrazac za cijenu ponude") i stranicu
- Ako aneks sadrži više pod-obrazaca, navedi svaki posebno

Odgovori ISKLJUČIVO u traženom JSON formatu. Ne dodaj ništa izvan JSON-a.`;

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "tender_doc_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        checklist_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Tačan naziv traženog dokumenta" },
              description: {
                type: "string",
                description: "Detaljan opis šta je potrebno — kako je napisano u TD",
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
                description: "Da li je stavka obavezna prema TD",
              },
              risk_note: {
                type: ["string", "null"],
                description: "Konkretna napomena o riziku iz TD, ili null",
              },
              page_reference: {
                type: ["string", "null"],
                description: "Referenca na stranicu, npr. 'Stranica 12, tačka 4.2.1'",
              },
              source_text: {
                type: ["string", "null"],
                description: "Citirani dio teksta iz TD koji definira ovaj zahtjev",
              },
            },
            required: [
              "name",
              "description",
              "document_type",
              "is_required",
              "risk_note",
              "page_reference",
              "source_text",
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
            },
            required: ["label", "date"],
            additionalProperties: false,
          },
        },
        eligibility_conditions: {
          type: "array",
          items: { type: "string" },
          description: "Uslovi kvalifikacije i podobnosti navedeni u TD",
        },
        risk_flags: {
          type: "array",
          items: { type: "string" },
          description: "Konkretni rizici za diskvalifikaciju navedeni u TD",
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

/**
 * Analyze extracted tender documentation text using AI.
 * Returns exact requirements with page references and source text.
 */
export async function analyzeTenderDocumentation(
  extractedText: string,
  tenderTitle?: string,
): Promise<TenderDocAnalysisResult> {
  const openai = getOpenAIClient();

  // Trim text to fit context window (~120k chars ≈ ~30k tokens for GPT-4o)
  const maxChars = 120_000;
  const text =
    extractedText.length > maxChars
      ? extractedText.slice(0, maxChars) +
        "\n\n[... tekst skraćen zbog ograničenja veličine ...]"
      : extractedText;

  const userMessage = tenderTitle
    ? `Analiziraj sljedeću tendersku dokumentaciju za tender "${tenderTitle}" i izvuci tačnu listu zahtjeva:\n\n${text}`
    : `Analiziraj sljedeću tendersku dokumentaciju i izvuci tačnu listu zahtjeva:\n\n${text}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: RESPONSE_SCHEMA,
    temperature: 0.1,
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("AI nije vratio odgovor pri analizi tenderske dokumentacije.");
  }

  return JSON.parse(rawContent) as TenderDocAnalysisResult;
}
