import "server-only";
import { getOpenAIClient } from "@/lib/openai";
import { AI_CATEGORY_VALUES } from "@/lib/opportunity-categories";
import type { HistoricalContext } from "./historical-context-calculator";

export interface EnhancedOpportunityContent {
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

// Blacklist of generic phrases to avoid
const GENERIC_PHRASE_BLACKLIST = [
  "odlična prilika",
  "ne propustite",
  "jedinstvena šansa",
  "izuzetna prilika",
  "savršena prilika",
  "idealna prilika",
];

const ENHANCED_SYSTEM_PROMPT = `Ti si SEO stručnjak i savjetnik za poslovne prilike u Bosni i Hercegovini.
Pišeš sadržaj koji istovremeno rangira na Google.ba I pomaže firmama da donesu prave odluke.

KRITIČNA PRAVILA:
1. Jezik: bosanski/hrvatski. Bez anglizama.
2. Bez generičkih fraza: ${GENERIC_PHRASE_BLACKLIST.join(", ")}
3. Budi konkretan i informativan - fokusiraj se na ČINJENICE, ne marketing
4. SEO pravilo br. 1: seo_title MORA biti pretraživački upit, NIKAD prepis naslova dokumenta
5. SEO pravilo br. 2: Uvijek uključi lokaciju, godinu (2026) i tip poticaja u prvom paragrafu ai_content
6. Koristi historijske podatke kada su dostupni - konkretni brojevi grade kredibilitet
7. Dodaj internal linkove ka relevantnim kategorijama
8. Uključi FAQ sekciju sa long-tail SEO keywords`;

/**
 * Enhanced AI Content Generator with historical context, urgency, SEO long-tail, and internal linking
 */
export async function generateEnhancedOpportunityContent(
  title: string,
  issuer: string,
  description: string | null,
  requirements: string | null,
  value: number | null,
  deadline: string | null,
  type: "tender" | "poticaj",
  location: string | null,
  eligibilitySignals: string[] | null,
  historicalContext?: HistoricalContext
): Promise<EnhancedOpportunityContent | null> {
  try {
    const openai = getOpenAIClient();

    const valueStr = value ? `${value.toLocaleString("bs-BA")} KM` : "nije navedena";
    const deadlineStr = deadline
      ? new Date(deadline).toLocaleDateString("bs-BA", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "nije naveden";
    const typeLabel = type === "tender" ? "javna nabavka" : "poticaj/grant";
    const locationStr = location ?? "Bosna i Hercegovina";
    const eligStr = eligibilitySignals?.length ? eligibilitySignals.join(", ") : null;

    const rawDesc = description?.slice(0, 800) ?? null;
    const rawReq = requirements?.slice(0, 600) ?? null;

    // Calculate days until deadline for urgency
    let daysUntilDeadline: number | null = null;
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      deadlineDate.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diffTime = deadlineDate.getTime() - now.getTime();
      daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const urgencyPrompt = daysUntilDeadline !== null && daysUntilDeadline > 0 && daysUntilDeadline <= 30
      ? `\n\nURGENCY: Rok za prijavu je za ${daysUntilDeadline} dana. OBAVEZNO istakni ovo u sekciji "Iznos i rok prijave" sa frazom: "⏰ Rok za prijavu: ${daysUntilDeadline} dana — ne propustite!"`
      : "";

    // Build historical context section for prompt
    let historicalContextPrompt = "";
    if (historicalContext) {
      historicalContextPrompt = `\n\nHISTORIJSKI KONTEKST (koristi ove podatke u sadržaju):
- Sličnih poziva u zadnjih 12 mjeseci: ${historicalContext.similar_calls_count}
- Poziva od iste institucije: ${historicalContext.issuer_calls_count}
- Trend kategorije: ${historicalContext.category_trend === "increasing" ? "rastući" : historicalContext.category_trend === "decreasing" ? "opadajući" : "stabilan"}
${historicalContext.typical_frequency ? `- Učestalost: ${historicalContext.typical_frequency}` : ""}
${historicalContext.last_similar_call ? `- Prošli sličan poziv: ${historicalContext.last_similar_call.title} (${historicalContext.last_similar_call.value.toLocaleString("bs-BA")} KM)` : ""}

KORISTI ove podatke u sekciji "Šta ovo znači za vašu firmu?" da daš kontekst o učestalosti i konkurenciji.`;
    }

    const prompt = `Analiziraj ovu poslovnu priliku i popuni SVA polja u JSON-u.
CILJ: Stranica treba rangirati na Google.ba za upite poput "poticaji [sektor] [lokacija] 2026".
Piši isključivo na osnovu dostavljenih podataka — bez izmišljenih iznosa, rokova ili uvjeta.

PODATCI O PRILICI:
Vrsta: ${typeLabel}
Naziv: ${title}
Institucija: ${issuer}
Lokacija: ${locationStr}
Vrijednost: ${valueStr}
Rok za prijavu: ${deadlineStr}
Ciljana publika (signali): ${eligStr ?? "nisu detektirani"}
Opis: ${rawDesc ?? "nije dostupan"}
Uvjeti: ${rawReq ?? "nisu navedeni"}${historicalContextPrompt}${urgencyPrompt}

JSON format — sva polja obavezna:
{
  "seo_title": "SEO naslov koji cilja PRETRAŽIVANJE — NIKAD ne kopiraj sirovi naziv dokumenta. Format obavezan: '[Vrsta] za [ko] u [lokacija] (2026)'. Primjeri ispravnog: 'Poticaji za mikro firme u Tuzlanskom kantonu (2026)' | 'EU grant za izvoznike u FBiH (2026)' | 'Subvencije za zapošljavanje Kanton Sarajevo (2026)' | 'Grantovi za startuppe u Republici Srpskoj (2026)'. Max 65 znakova.",
  "seo_description": "Meta opis 140-155 znakova koji uključuje: vrstu poticaja, lokaciju, ko može aplicirati, rok/vrijednost ako su poznati. Počni akcijskom riječju (Prijavite se / Saznajte više / Iskoristite). Uključi ključne pojmove: poticaji, grantovi, ${locationStr}, firme.",
  "ai_summary": "2 rečenice sažetka koje uključuju: vrstu poticaja/granta, lokaciju (${locationStr}) i konkretnu ciljanu skupinu. Zvuči kao stručni pregled, ne prepis naslova. ${historicalContext ? "Uključi historijski kontekst ako je relevantan." : ""}",
  "ai_who_should_apply": "Konkretno koje firme, preduzetnici ili organizacije trebaju aplicirati — sektori, veličina, lokacija. ${eligStr ? `Obavezno uključi eligibility signale: ${eligStr}` : ""} 2-3 rečenice.",
  "ai_difficulty": "lako|srednje|tesko",
  "ai_risks": "Glavni rizici i izazovi prijave — max 2 rečenice.",
  "ai_competition": "Procjena konkurentnosti: ${historicalContext ? `Na osnovu historijskih podataka (${historicalContext.similar_calls_count} sličnih poziva u zadnjih 12 mjeseci, trend ${historicalContext.category_trend}), ` : ""}koliko je tražen ovaj tip poticaja, realni broj prijavitelja, šanse za uspjeh. Max 2 rečenice.",
  "ai_content": "FORMAT PRAVILA (strogo obavezno):\\n1. Heading (## Naslov) — UVIJEK na svojoj liniji, odvojen PRAZNOM LINIJOM od teksta.\\n2. NIKAD heading i paragraf na istoj liniji.\\n3. INTERNAL LINKING: Kada spominješ kategorije poticaja (npr. 'poticaji za poljoprivredu', 'grantovi za NVO', 'subvencije za izvoz'), dodaj link u formatu [tekst](/prilike/kategorija/[slug]). Primjeri: [poticaji za poljoprivredu](/prilike/kategorija/poljoprivreda), [grantovi za MSP](/prilike/kategorija/msp), [subvencije za izvoz](/prilike/kategorija/izvoz).\\n\\nStruktura (500-750 riječi):\\n\\n## O ovom pozivu\\n\\n[KRITIČNO: Ovaj paragraf mora sadržavati ključne SEO pojmove. Obavezno uključi: (1) vrstu finansiranja — poticaj/grant/subvencija, (2) lokaciju — ${locationStr}, (3) ciljanu skupinu — firme/poduzetnike, (4) godinu — 2026. Obrazac: '${issuer} raspisao je u 2026. godini [vrstu] namijenjen [kome] u ${locationStr}...' Zatim 1-2 rečenice o svrsi programa i ciljevima.]\\n\\n## Ko treba aplicirati?\\n\\n[Konkretni uvjeti prihvatljivosti — sektori, veličina firme, lokacija, registracija. ${eligStr ? `OBAVEZNO uključi eligibility signale: ${eligStr}.` : ""} Ako uvjeti nisu dostupni, napiši da su detalji u originalnoj dokumentaciji institucije ${issuer}. Dodaj internal linkove gdje je relevantno.]\\n\\n## Šta ovo znači za vašu firmu?\\n\\n[SAVJETODAVNA ANALIZA sa historijskim kontekstom: ${historicalContext ? `(1) Učestalost: ${historicalContext.typical_frequency ?? `${historicalContext.similar_calls_count} sličnih poziva u zadnjih 12 mjeseci`}. (2) Trend: ${historicalContext.category_trend === "increasing" ? "Rastući broj poziva u ovoj kategoriji" : historicalContext.category_trend === "decreasing" ? "Opadajući broj poziva" : "Stabilan broj poziva"}. ` : ""}(3) Isplati li se prijaviti s obzirom na obim dokumentacije? (4) Koliko je realna konkurencija? (5) Za koga je ovo posebno dobra prilika? Nije generično — daj konkretno mišljenje na osnovu tipa poziva i vrijednosti.]\\n\\n## Iznos i rok prijave\\n\\n[Finansijski detalji, način isplate/refundacije i rok. ${urgencyPrompt ? "OBAVEZNO istakni urgency: '⏰ Rok za prijavu: X dana — ne propustite!'" : ""} Ako vrijednost nije navedena — piši da je definisana u pozivu.]\\n\\n## Kako aplicirati?\\n\\n[Konkretni koraci ili: Kompletan postupak i dokumentacija dostupni su na web stranici institucije ${issuer}.]\\n\\n## Često postavljana pitanja\\n\\n[NOVI BLOK za SEO long-tail keywords. Dodaj 2-3 pitanja u formatu:\\n\\n**Kako dobiti ${typeLabel} u ${locationStr}?**\\n[Kratak odgovor sa konkretnim koracima]\\n\\n**Koji su najčešći razlozi odbijanja prijave?**\\n[Lista 2-3 najčešća razloga]\\n\\n**Ko može aplicirati za ovaj ${typeLabel}?**\\n[Kratak pregled eligibility kriterija]\\n]\\n\\nZadnja rečenica: Pratite ove i slične poticaje za firme u BiH na MojaPonuda.ba — baza se ažurira svakodnevno.\\n\\nPIŠI ISKLJUČIVO NA OSNOVU DOSTAVLJENIH PODATAKA. Uključi prirodno: poticaji ${locationStr} 2026, grantovi za firme BiH, ${typeLabel}. NIKAD ne koristi generičke fraze: ${GENERIC_PHRASE_BLACKLIST.join(", ")}. DODAJ internal linkove gdje je relevantno.",
  "category": "Odaberi JEDNU kategoriju iz liste: ${AI_CATEGORY_VALUES.join(" | ")}"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ENHANCED_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 3000, // Increased for longer content with FAQ
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as EnhancedOpportunityContent;

    // Validate difficulty
    if (!["lako", "srednje", "tesko"].includes(parsed.ai_difficulty)) {
      parsed.ai_difficulty = "srednje";
    }

    // Check for generic phrases in content (post-processing filter)
    const contentLower = parsed.ai_content.toLowerCase();
    const foundGenericPhrases = GENERIC_PHRASE_BLACKLIST.filter((phrase) =>
      contentLower.includes(phrase)
    );

    if (foundGenericPhrases.length > 0) {
      console.warn(
        `[EnhancedAI] Generic phrases detected in content: ${foundGenericPhrases.join(", ")}`
      );
      // Remove generic phrases
      for (const phrase of foundGenericPhrases) {
        const regex = new RegExp(phrase, "gi");
        parsed.ai_content = parsed.ai_content.replace(regex, "");
      }
    }

    return parsed;
  } catch (error) {
    console.error("[EnhancedAI] Content generation failed:", error);
    return null;
  }
}

/**
 * Retry logic with exponential backoff for AI content generation
 */
export async function generateEnhancedContentWithRetry(
  title: string,
  issuer: string,
  description: string | null,
  requirements: string | null,
  value: number | null,
  deadline: string | null,
  type: "tender" | "poticaj",
  location: string | null,
  eligibilitySignals: string[] | null,
  historicalContext?: HistoricalContext,
  maxRetries: number = 3
): Promise<EnhancedOpportunityContent | null> {
  const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const content = await generateEnhancedOpportunityContent(
        title,
        issuer,
        description,
        requirements,
        value,
        deadline,
        type,
        location,
        eligibilitySignals,
        historicalContext
      );

      if (content) {
        return content;
      }
    } catch (error) {
      console.error(`[EnhancedAI] Attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries - 1) {
        const delay = delays[attempt];
        console.log(`[EnhancedAI] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[EnhancedAI] All ${maxRetries} attempts failed for: ${title}`);
  return null;
}
