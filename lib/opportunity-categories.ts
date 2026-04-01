/**
 * Definicija SEO kategorija za prilike
 * Svaka kategorija ima slug, naslov, opis i listu DB kategorija koje pokriva
 */

export interface OpportunityCategory {
  slug: string;
  title: string;
  h1: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  /** DB category values that map to this SEO category */
  dbCategories: string[];
  /** DB type filter (optional) */
  type?: "tender" | "poticaj";
  /** Eligibility signal filter (optional) */
  eligibilitySignal?: string;
}

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  {
    slug: "it-tenderi",
    title: "IT tenderi",
    h1: "IT tenderi i javne nabavke u BiH",
    description: "Aktivne javne nabavke za IT usluge, softver i hardver u Bosni i Hercegovini.",
    metaTitle: "IT tenderi BiH 2026 — Javne nabavke za IT usluge | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne IT tendere u BiH. Softver, hardver, IT usluge i digitalizacija. Svakodnevno ažurirano.",
    dbCategories: ["IT", "Informacione tehnologije", "Softver", "Hardver", "Digitalizacija"],
    type: "tender",
  },
  {
    slug: "gradevinski-tenderi",
    title: "Građevinski tenderi",
    h1: "Građevinski tenderi i javne nabavke u BiH",
    description: "Aktivne javne nabavke za građevinske radove, infrastrukturu i rekonstrukciju u BiH.",
    metaTitle: "Građevinski tenderi BiH 2026 — Radovi i infrastruktura | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne građevinske tendere u BiH. Radovi, infrastruktura, rekonstrukcija. Svakodnevno ažurirano.",
    dbCategories: ["Građevinarstvo", "Radovi", "Infrastruktura", "Rekonstrukcija", "Izgradnja"],
    type: "tender",
  },
  {
    slug: "konsultantske-usluge",
    title: "Konsultantske usluge",
    h1: "Tenderi za konsultantske usluge u BiH",
    description: "Javne nabavke za konsultantske, savjetodavne i stručne usluge u Bosni i Hercegovini.",
    metaTitle: "Konsultantski tenderi BiH 2026 — Savjetodavne usluge | MojaPonuda.ba",
    metaDescription: "Pronađite tendere za konsultantske usluge u BiH. Savjetovanje, studije, ekspertize. Svakodnevno ažurirano.",
    dbCategories: ["Konsultantske usluge", "Savjetodavne usluge", "Stručne usluge", "Studije"],
    type: "tender",
  },
  {
    slug: "poticaji-za-msp",
    title: "Poticaji za MSP",
    h1: "Poticaji i grantovi za mala i srednja preduzeća u BiH",
    description: "Aktivni grantovi, subvencije i poticaji za mala i srednja preduzeća (MSP) u Bosni i Hercegovini.",
    metaTitle: "Poticaji za MSP BiH 2026 — Grantovi za mala preduzeća | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne poticaje i grantove za MSP u BiH. Subvencije, bespovratna sredstva, programi podrške.",
    dbCategories: ["Poticaji i grantovi", "MSP", "Mala preduzeća"],
    type: "poticaj",
    eligibilitySignal: "MSP",
  },
  {
    slug: "poticaji-za-poljoprivredu",
    title: "Poticaji za poljoprivredu",
    h1: "Poticaji i grantovi za poljoprivredu u BiH",
    description: "Aktivni grantovi, subvencije i poticaji za poljoprivrednike i agrarne firme u Bosni i Hercegovini.",
    metaTitle: "Poticaji za poljoprivredu BiH 2026 — Grantovi za farmere | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne poticaje za poljoprivredu u BiH. Subvencije za farmere, ruralni razvoj, agrar.",
    dbCategories: ["Poticaji i grantovi", "Poljoprivreda", "Ruralni razvoj"],
    type: "poticaj",
    eligibilitySignal: "poljoprivrednici",
  },
  {
    slug: "poticaji-za-izvoznike",
    title: "Poticaji za izvoznike",
    h1: "Poticaji i grantovi za izvoznike u BiH",
    description: "Aktivni grantovi i poticaji za firme koje se bave izvozom iz Bosne i Hercegovine.",
    metaTitle: "Poticaji za izvoznike BiH 2026 — Grantovi za izvoz | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne poticaje za izvoznike u BiH. Subvencije za izvoz, internacionalizacija, EU tržište.",
    dbCategories: ["Poticaji i grantovi", "Izvoz", "Internacionalizacija"],
    type: "poticaj",
    eligibilitySignal: "izvoznici",
  },
  {
    slug: "eu-grantovi",
    title: "EU grantovi",
    h1: "EU grantovi i fondovi za firme u BiH",
    description: "Europski grantovi, IPA fondovi i EU programi dostupni firmama u Bosni i Hercegovini.",
    metaTitle: "EU grantovi BiH 2026 — Europski fondovi za firme | MojaPonuda.ba",
    metaDescription: "Pronađite EU grantove i fondove dostupne firmama u BiH. IPA, Horizon, COSME i drugi EU programi.",
    dbCategories: ["EU grantovi", "Europski fondovi", "IPA", "UNDP"],
    type: "poticaj",
  },
  {
    slug: "zdravstvo-i-socijala",
    title: "Zdravstvo i socijala",
    h1: "Tenderi za zdravstvo i socijalne usluge u BiH",
    description: "Javne nabavke za zdravstvene usluge, medicinsku opremu i socijalne programe u BiH.",
    metaTitle: "Zdravstveni tenderi BiH 2026 — Medicinska oprema i usluge | MojaPonuda.ba",
    metaDescription: "Pronađite tendere za zdravstvo u BiH. Medicinska oprema, zdravstvene usluge, socijalni programi.",
    dbCategories: ["Zdravstvo", "Medicinska oprema", "Socijalne usluge", "Farmaceutika"],
    type: "tender",
  },
];

export function getCategoryBySlug(slug: string): OpportunityCategory | undefined {
  return OPPORTUNITY_CATEGORIES.find((c) => c.slug === slug);
}

export function getAllCategorySlugs(): string[] {
  return OPPORTUNITY_CATEGORIES.map((c) => c.slug);
}

/** Find the SEO category whose dbCategories array includes this raw DB value */
export function getCategoryByDbName(dbCategory: string | null | undefined): OpportunityCategory | undefined {
  if (!dbCategory) return undefined;
  return OPPORTUNITY_CATEGORIES.find((c) => c.dbCategories.includes(dbCategory));
}
