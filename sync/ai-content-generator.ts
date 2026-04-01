import "server-only";
import { getOpenAIClient } from "@/lib/openai";
import { AI_CATEGORY_VALUES } from "@/lib/opportunity-categories";

export interface OpportunityAiContent {
  seo_title: string;
  seo_description: string;
  ai_summary: string;
  ai_who_should_apply: string;
  ai_difficulty: "lako" | "srednje" | "tesko";
  ai_risks: string;
  ai_competition: string;
  ai_content: string;
  category?: string;
}

const SYSTEM_PROMPT = `Ti si stručnjak za javne nabavke i poslovne prilike u Bosni i Hercegovini.
Pišeš kratke, precizne i korisne analize za firme koje traže prilike.
Jezik: bosanski/hrvatski. Bez anglizama. Bez generičkih fraza.
Budi konkretan i informativan. Maksimalno 2-3 rečenice po polju.`;

/**
 * AI Review Gate: Checks if a scraped item is a legitimate business opportunity
 * before it gets published. This catches garbage that keyword filters miss.
 * 
 * Returns { approved: boolean, reason: string }
 */
export interface AiReviewResult {
  approved: boolean;
  reason: string;
}

export async function aiReviewOpportunity(
  title: string,
  issuer: string,
  description: string | null,
  requirements: string | null,
): Promise<AiReviewResult> {
  try {
    const openai = getOpenAIClient();

    const prompt = `Pregledaj ovaj podatak scraperan sa državne web stranice i odluči da li je to LEGITIMNA POSLOVNA PRILIKA (javni poziv, grant, poticaj, subvencija, konkurs) za firme/privrednike u Bosni i Hercegovini.

Naslov: ${title}
Institucija: ${issuer}
Opis: ${description?.slice(0, 400) ?? "nema"}
Uvjeti: ${requirements?.slice(0, 200) ?? "nema"}

ODBIJ ako je:
- Navigacijski element web stranice (meni, footer, breadcrumb, copyright)
- Osobna stvar (vozačka, instruktor vožnje, stručni ispit, lična licenca)
- Imenovanje/razrješenje/izbor članova odbora
- Obavijest koja NIJE javni poziv (vijest, press, saopštenje bez konkretnog poziva)
- Generički naslov bez sadržaja (samo ime ministarstva, "Javni poziv" bez detalja)
- Garbage/nonsens tekst scraperan greškom

ODOBRI ako je:
- Konkretan javni poziv za dodjelu sredstava firmama
- Grant ili poticaj za privrednike/poduzetnike/obrtnike
- Subvencija za zapošljavanje ili razvoj
- Konkurs za finansiranje projekata organizacija

Odgovori SAMO u JSON formatu:
{
  "approved": true/false,
  "reason": "kratko obrazloženje na bosanskom"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Ti si kontrolor kvalitete podataka za platformu javnih nabavki u BiH. Budi strog — bolje je propustiti legitimnu priliku nego objaviti smeće." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { approved: true, reason: "AI review unavailable" };

    const parsed = JSON.parse(raw) as { approved: boolean; reason: string };
    return {
      approved: !!parsed.approved,
      reason: parsed.reason ?? "Bez obrazloženja",
    };
  } catch {
    // If AI review fails, allow through (fail open) but log it
    console.warn(`[AI Review] Failed for: ${title.slice(0, 50)}`);
    return { approved: true, reason: "AI review error — passed by default" };
  }
}

export async function generateOpportunityContent(
  title: string,
  issuer: string,
  description: string | null,
  requirements: string | null,
  value: number | null,
  deadline: string | null,
  type: "tender" | "poticaj",
  location?: string | null,
  eligibilitySignals?: string[] | null,
): Promise<OpportunityAiContent | null> {
  try {
    const openai = getOpenAIClient();

    const valueStr = value ? `${value.toLocaleString("bs-BA")} KM` : "nije navedena";
    const deadlineStr = deadline
      ? new Date(deadline).toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" })
      : "nije naveden";
    const typeLabel = type === "tender" ? "javna nabavka" : "poticaj/grant";
    const locationStr = location ?? "Bosna i Hercegovina";
    const eligStr = eligibilitySignals?.length ? eligibilitySignals.join(", ") : null;

    const rawDesc = description?.slice(0, 800) ?? null;
    const rawReq = requirements?.slice(0, 600) ?? null;

    const prompt = `Analiziraj ovu poslovnu priliku i popuni SVA polja u JSON-u.
Piši isključivo na osnovu dostavljenih podataka — bez izmišljenih detalja, iznosa ili uvjeta koji nisu navedeni.

PODATCI O PRILICI:
Vrsta: ${typeLabel}
Naziv: ${title}
Institucija: ${issuer}
Lokacija: ${locationStr}
Vrijednost: ${valueStr}
Rok za prijavu: ${deadlineStr}
Eligibilnost (signali iz teksta): ${eligStr ?? "nisu detektirani"}
Sirovi opis s web stranice: ${rawDesc ?? "nije dostupan"}
Sirovi uvjeti s web stranice: ${rawReq ?? "nisu navedeni"}

JSON format — sva polja obavezna:
{
  "seo_title": "SEO naslov max 60 znakova — konkretan, uključi naziv i instituciju",
  "seo_description": "Meta opis max 155 znakova — informativan, uključi rok/vrijednost ako poznati",
  "ai_summary": "Sažetak prilike u 2 rečenice — samo provjerene informacije",
  "ai_who_should_apply": "Koje firme/osobe trebaju aplicirati i zašto — konkretan odgovor",
  "ai_difficulty": "lako|srednje|tesko",
  "ai_risks": "Glavni rizici i izazovi prijave — max 2 rečenice",
  "ai_competition": "Procjena konkurencije i tržišta — max 2 rečenice",
  "ai_content": "VAŽNO — FORMAT PRAVILA (obavezno poštovati):\\n1. Svaki heading (## Naslov) mora biti na SVOJOJ LINIJI, odvojen praznom linijom od teksta ispod.\\n2. NIKAD ne stavljaj heading i paragraf na istu liniju.\\n3. Ispravno:\\n## O ovom pozivu\\n\\nTekst paragraf ovdje.\\n\\n## Ko može aplicirati?\\n\\nTekst paragraf ovdje.\\n\\nNeispravno (zabranjeno): ## O ovom pozivu Tekst paragraf ovdje.\\n\\nStruktura članka (300-600 riječi):\\n\\n## O ovom pozivu\\n\\n[2-3 rečenice o svrsi poziva i instituciji koja ga objavljuje]\\n\\n## Ko može aplicirati?\\n\\n[Konkretni uvjeti prihvatljivosti. Ako nisu dostupni: napiši da su uvjeti navedeni u originalnoj dokumentaciji.]\\n\\n## Iznos i rok\\n\\n[Finansijske informacije i rok. Ako vrijednost nije poznata: napiši da će biti navedena u dokumentaciji.]\\n\\n## Kako aplicirati?\\n\\n[Upute ili: Kompletna dokumentacija dostupna je na web stranici ${issuer}.]\\n\\nZavrši s: Pratite ovu i slične prilike na MojaPonuda.ba\\n\\nSEO ključne riječi: javni poziv BiH, ${typeLabel}, ${locationStr}. Piši samo na osnovu dostavljenih podataka — bez izmišljenih detalja.",
  "category": "Odaberi JEDNU kategoriju iz liste: ${AI_CATEGORY_VALUES.join(' | ')}"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as OpportunityAiContent;

    if (!["lako", "srednje", "tesko"].includes(parsed.ai_difficulty)) {
      parsed.ai_difficulty = "srednje";
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function generateLegalSummary(
  title: string,
  type: "zakon" | "izmjena" | "vijest",
  rawContent: string | null
): Promise<string | null> {
  if (!rawContent) return null;

  try {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Napiši kratki sažetak (2-3 rečenice) ove pravne ${type === "vijest" ? "vijesti" : "izmjene"} za firme koje se bave javnim nabavkama:\n\nNaslov: ${title}\n\nSadržaj: ${rawContent.slice(0, 800)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
