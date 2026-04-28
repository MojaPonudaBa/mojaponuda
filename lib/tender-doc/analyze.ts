import { getOpenAIClient } from "@/lib/openai";
import type { AnalysisChecklistItem, AnalysisDeadline, AnalysisResult } from "@/lib/ai/tender-analysis";

/**
 * Extended checklist item with page reference and source text
 * for tender-documentation-based analysis.
 */
export interface TenderDocChecklistItem extends AnalysisChecklistItem {
  page_reference: string | null;
  source_text: string | null;
  page_number: number | null;
}

export interface TenderDocAnalysisResult extends AnalysisResult {
  checklist_items: TenderDocChecklistItem[];
}

const SYSTEM_PROMPT = `Ti si ekspertni analitičar za javne nabavke u Bosni i Hercegovini.

ZADATAK: Iz teksta tenderske dokumentacije (TD) izvuci KOMPLETNU listu svega što ponuđač mora dostaviti.

═══════════════════════════════════════
PRAVILO O STRANICAMA (KRITIČNO!)
═══════════════════════════════════════
Tekst dokumenta sadrži oznake [Stranica 1], [Stranica 2], [Stranica 3] itd.
- Polje "page_number" MORA biti INTEGER — tačan broj iz najbliže prethodne oznake [Stranica X]
- Polje "page_reference" je čitljiv opis, npr. "Stranica 26, tačka 4.16"
- NIKADA ne izmišljaj brojeve stranica. Ako tekst kaže "[Stranica 26]" pa onda govori o tački 4.16, onda je page_number = 26
- Ako nisi siguran, pogledaj koja [Stranica X] oznaka se pojavljuje NEPOSREDNO PRIJE tog teksta

═══════════════════════════════════════
PRAVILO O ANEKSIMA I OBRASCIMA (KRITIČNO!)
═══════════════════════════════════════
Tenderska dokumentacija UVIJEK sadrži anekse i obrasce — obično na KRAJU dokumenta.
MORAŠ proći CIJELI dokument do samog kraja i identificirati SVE:
- "Aneks" (Aneks 1, Aneks 2, Aneks 3...)
- "Obrazac" (Obrazac za cijenu, Obrazac ponude...)
- "Prilog" (Prilog A, Prilog B...)
- "Formular"
- Bilo koji predložak/šablon koji ponuđač mora popuniti

Za svaki pronađeni aneks/obrazac:
- Kreiraj ZASEBNU stavku sa document_type = "form"
- Navedi TAČAN naziv kako piše u dokumentu (npr. "Aneks 3 - Obrazac za cijenu ponude")
- page_number = broj stranice na kojoj aneks POČINJE
- is_required = true (svi aneksi su obavezni osim ako eksplicitno piše drugačije)

Ako u tekstu naiđeš na "Obrazac i tekst Izjave dat je u Aneksu 11" ili slično — to znači da postoji Aneks 11 koji se MORA navesti kao form stavka.

═══════════════════════════════════════
TIPOVI DOKUMENATA
═══════════════════════════════════════
- registration: rješenje o registraciji, izvod iz sudskog registra
- tax: porezna uvjerenja
- contributions: uvjerenja o doprinosima za zaposlene
- guarantee: bankarske garancije
- reference: reference projekata, potvrde o izvršenim ugovorima
- financial: bilans stanja, bilans uspjeha, finansijski izvještaji
- staff: CV-ovi, diplome, certifikati osoblja
- license: dozvole, licence, odobrenja
- declaration: izjave ponuđača (nekažnjavanje, sposobnost itd.)
- form: obrasci, aneksi, prilozi, formulari koje ponuđač popunjava
- other: sve ostalo

═══════════════════════════════════════
OSTALA PRAVILA
═══════════════════════════════════════
1. Izvuci ISKLJUČIVO zahtjeve eksplicitno navedene u dokumentu
2. Za svaki zahtjev citiraj relevantan dio teksta u "source_text"
3. Označi da li je obavezan ili opcioni
4. Dodaj risk_note samo ako postoji konkretan uslov (rok, format, ovjera)
5. NE DODAJ ništa što nije traženo u dokumentu

Odgovori ISKLJUČIVO u JSON formatu.`;

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
              page_number: {
                type: ["integer", "null"],
                description: "Broj stranice iz oznake [Stranica X] u tekstu. MORA biti tačan integer iz najbliže prethodne oznake [Stranica X]. Ne izmišljaj.",
              },
              page_reference: {
                type: ["string", "null"],
                description: "Čitljiva referenca, npr. 'Stranica 26, tačka 4.16'. Broj stranice MORA odgovarati page_number polju.",
              },
              source_text: {
                type: ["string", "null"],
                description: "TAČAN citat iz dokumenta (copy-paste) koji definira ovaj zahtjev. Maksimalno 200 karaktera.",
              },
            },
            required: [
              "name",
              "description",
              "document_type",
              "is_required",
              "risk_note",
              "page_number",
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

  // GPT-4o supports 128k tokens. ~200k chars ≈ ~50k tokens for text + prompt + response.
  // Must be large enough to include annexes/forms at the END of long documents.
  const maxChars = 200_000;
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
    throw new Error("Analiza nije vratila odgovor pri obradi tenderske dokumentacije.");
  }

  return JSON.parse(rawContent) as TenderDocAnalysisResult;
}
