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

const SYSTEM_PROMPT = `Ti si SEO struÄnjak i savjetnik za poslovne prilike u Bosni i Hercegovini.
PiÅ¡eÅ¡ sadrÅ¾aj koji istovremeno rangira na Google.ba I pomaÅ¾e firmama da donesu prave odluke.
Jezik: bosanski/hrvatski. Bez anglizama. Bez generiÄkih fraza. Budi konkretan i informativan.
SEO pravilo br. 1: seo_title MORA biti pretraÅ¾ivaÄki upit, NIKAD prepis naslova dokumenta.
SEO pravilo br. 2: Uvijek ukljuÄi lokaciju, godinu (2026) i tip poticaja u prvom paragrafu ai_content.`;

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

    const prompt = `Pregledaj ovaj podatak scraperan sa drÅ¾avne web stranice i odluÄi da li je to LEGITIMNA POSLOVNA PRILIKA (javni poziv, grant, poticaj, subvencija, konkurs) za firme/privrednike u Bosni i Hercegovini.

Naslov: ${title}
Institucija: ${issuer}
Opis: ${description?.slice(0, 400) ?? "nema"}
Uvjeti: ${requirements?.slice(0, 200) ?? "nema"}

ODBIJ ako je:
- Navigacijski element web stranice (meni, footer, breadcrumb, copyright)
- Osobna stvar (vozaÄka, instruktor voÅ¾nje, struÄni ispit, liÄna licenca)
- Imenovanje/razrjeÅ¡enje/izbor Älanova odbora
- Obavijest koja NIJE javni poziv (vijest, press, saopÅ¡tenje bez konkretnog poziva)
- GeneriÄki naslov bez sadrÅ¾aja (samo ime ministarstva, "Javni poziv" bez detalja)
- Garbage/nonsens tekst scraperan greÅ¡kom

ODOBRI ako je:
- Konkretan javni poziv za dodjelu sredstava firmama
- Grant ili poticaj za privrednike/poduzetnike/obrtnike
- Subvencija za zapoÅ¡ljavanje ili razvoj
- Konkurs za finansiranje projekata organizacija

Odgovori SAMO u JSON formatu:
{
  "approved": true/false,
  "reason": "kratko obrazloÅ¾enje na bosanskom"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Ti si kontrolor kvalitete podataka za platformu javnih nabavki u BiH. Budi strog â€” bolje je propustiti legitimnu priliku nego objaviti smeÄ‡e." },
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
      reason: parsed.reason ?? "Bez obrazloÅ¾enja",
    };
  } catch {
    // If AI review fails, allow through (fail open) but log it
    console.warn(`[AI Review] Failed for: ${title.slice(0, 50)}`);
    return { approved: true, reason: "AI review error â€” passed by default" };
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
CILJ: Stranica treba rangirati na Google.ba za upite poput "poticaji [sektor] [lokacija] 2026".
PiÅ¡i iskljuÄivo na osnovu dostavljenih podataka â€” bez izmiÅ¡ljenih iznosa, rokova ili uvjeta.

PODATCI O PRILICI:
Vrsta: ${typeLabel}
Naziv: ${title}
Institucija: ${issuer}
Lokacija: ${locationStr}
Vrijednost: ${valueStr}
Rok za prijavu: ${deadlineStr}
Ciljana publika (signali): ${eligStr ?? "nisu detektirani"}
Opis: ${rawDesc ?? "nije dostupan"}
Uvjeti: ${rawReq ?? "nisu navedeni"}

JSON format â€” sva polja obavezna:
{
  "seo_title": "SEO naslov koji cilja PRETRAÅ½IVANJE â€” NIKAD ne kopiraj sirovi naziv dokumenta. Format obavezan: '[Vrsta] za [ko] u [lokacija] (2026)'. Primjeri ispravnog: 'Poticaji za mikro firme u Tuzlanskom kantonu (2026)' | 'EU grant za izvoznike u FBiH (2026)' | 'Subvencije za zapoÅ¡ljavanje Kanton Sarajevo (2026)' | 'Grantovi za startuppe u Republici Srpskoj (2026)'. Max 65 znakova.",
  "seo_description": "Meta opis 140-155 znakova koji ukljuÄuje: vrstu poticaja, lokaciju, ko moÅ¾e aplicirati, rok/vrijednost ako su poznati. PoÄni akcijskom rijeÄju (Prijavite se / Saznajte viÅ¡e / Iskoristite). UkljuÄi kljuÄne pojmove: poticaji, grantovi, ${locationStr}, firme.",
  "ai_summary": "2 reÄenice saÅ¾etka koje ukljuÄuju: vrstu poticaja/granta, lokaciju (${locationStr}) i konkretnu ciljanu skupinu. ZvuÄi kao struÄni pregled, ne prepis naslova.",
  "ai_who_should_apply": "Konkretno koje firme, preduzetnici ili organizacije trebaju aplicirati â€” sektori, veliÄina, lokacija. 2-3 reÄenice.",
  "ai_difficulty": "lako|srednje|tesko",
  "ai_risks": "Glavni rizici i izazovi prijave â€” max 2 reÄenice.",
  "ai_competition": "Procjena konkurentnosti: koliko je traÅ¾en ovaj tip poticaja, realni broj prijavitelja, Å¡anse za uspjeh. Max 2 reÄenice.",
  "ai_content": "FORMAT PRAVILA (strogo obavezno):\\n1. Heading (## Naslov) â€” UVIJEK na svojoj liniji, odvojen PRAZNOM LINIJOM od teksta.\\n2. NIKAD heading i paragraf na istoj liniji.\\n\\nStruktura (400-650 rijeÄi):\\n\\n## O ovom pozivu\\n\\n[KRITIÄŒNO: Ovaj paragraf mora sadrÅ¾avati kljuÄne SEO pojmove. Obavezno ukljuÄi: (1) vrstu finansiranja â€” poticaj/grant/subvencija, (2) lokaciju â€” ${locationStr}, (3) ciljanu skupinu â€” firme/poduzetnike, (4) godinu â€” 2026. Obrazac: '${issuer} raspisao je u 2026. godini [vrstu] namijenjen [kome] u ${locationStr}...' Zatim 1-2 reÄenice o svrsi programa i ciljevima.]\\n\\n## Ko treba aplicirati?\\n\\n[Konkretni uvjeti prihvatljivosti â€” sektori, veliÄina firme, lokacija, registracija. Ako uvjeti nisu dostupni, napiÅ¡i da su detalji u originalnoj dokumentaciji institucije ${issuer}.]\\n\\n## Å ta ovo znaÄi za vaÅ¡u firmu?\\n\\n[SAVJETODAVNA ANALIZA â€” budi iskren i koristan: (1) Isplati li se prijaviti s obzirom na obim dokumentacije? (2) Koliko je realna konkurencija? (3) Za koga je ovo posebno dobra prilika? Nije generiÄno â€” daj konkretno miÅ¡ljenje na osnovu tipa poziva i vrijednosti.]\\n\\n## Iznos i rok prijave\\n\\n[Finansijski detalji, naÄin isplate/refundacije i rok. Ako vrijednost nije navedena â€” piÅ¡i da je definisana u pozivu.]\\n\\n## Kako aplicirati?\\n\\n[Konkretni koraci ili: Kompletan postupak i dokumentacija dostupni su na web stranici institucije ${issuer}.]\\n\\nZadnja reÄenica: Pratite ove i sliÄne poticaje za firme u BiH na TenderSistem.com â€” baza se aÅ¾urira svakodnevno.\\n\\nPIÅ I ISKLJUÄŒIVO NA OSNOVU DOSTAVLJENIH PODATAKA. UkljuÄi prirodno: poticaji ${locationStr} 2026, grantovi za firme BiH, ${typeLabel}.",
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
      max_tokens: 2500,
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
          content: `NapiÅ¡i kratki saÅ¾etak (2-3 reÄenice) ove pravne ${type === "vijest" ? "vijesti" : "izmjene"} za firme koje se bave javnim nabavkama:\n\nNaslov: ${title}\n\nSadrÅ¾aj: ${rawContent.slice(0, 800)}`,
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

