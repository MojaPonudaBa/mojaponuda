/**
 * Definicija SEO kategorija za poticaje i grantove.
 * Samo poticaji â€” tenderi su iskljuÄeni iz javnih stranica.
 * dbCategories NESMIJU se preklapati izmeÄ‘u kategorija.
 *
 * AI kategorije koje se dodjeljuju novim postovima:
 *   "Poticaji i grantovi" | "EU grantovi" | "Poticaji za MSP" |
 *   "Poticaji za poljoprivredu" | "Poticaji za izvoznike" |
 *   "Digitalizacija" | "Energetika" | "ZapoÅ¡ljavanje" |
 *   "Inovacije" | "Turizam"
 */

export interface OpportunityCategory {
  slug: string;
  title: string;
  h1: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  /** DB category values that map to this SEO category â€” must not overlap across categories */
  dbCategories: string[];
  /** When true the category page shows ALL active poticaji (no category filter). Used for the catch-all overview. */
  showAll?: boolean;
  type?: "poticaj";
}

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  {
    slug: "svi-poticaji",
    title: "Svi poticaji",
    h1: "Svi poticaji i grantovi u BiH",
    description: "Kompletna lista aktivnih poticaja, grantova i subvencija za firme u Bosni i Hercegovini. Federalni, kantonalni i EU programi.",
    metaTitle: "Svi poticaji BiH 2026 â€” Grantovi i subvencije za firme | TenderSistem.com",
    metaDescription: "PronaÄ‘ite sve aktivne poticaje i grantove u BiH. Federalni, kantonalni i EU programi podrÅ¡ke za firme. Svakodnevno aÅ¾urirano.",
    dbCategories: ["Poticaji i grantovi", "Ostali poticaji", "Subvencije", "Lokalni poticaji"],
    showAll: true,
    type: "poticaj",
  },
  {
    slug: "eu-grantovi",
    title: "EU grantovi",
    h1: "EU grantovi i fondovi za firme u BiH",
    description: "Europski grantovi, IPA fondovi i EU programi dostupni firmama u Bosni i Hercegovini.",
    metaTitle: "EU grantovi BiH 2026 â€” Europski fondovi za firme | TenderSistem.com",
    metaDescription: "PronaÄ‘ite EU grantove i fondove dostupne firmama u BiH. IPA, Horizon, UNDP i drugi programi.",
    dbCategories: ["EU grantovi", "Europski fondovi", "IPA", "UNDP", "EU fondovi"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-msp",
    title: "Poticaji za MSP",
    h1: "Poticaji i grantovi za mala i srednja preduzeÄ‡a u BiH",
    description: "Aktivni grantovi, subvencije i poticaji za mala i srednja preduzeÄ‡a u Bosni i Hercegovini.",
    metaTitle: "Poticaji za MSP BiH 2026 â€” Grantovi za mala preduzeÄ‡a | TenderSistem.com",
    metaDescription: "PronaÄ‘ite aktivne poticaje i grantove za MSP u BiH. Subvencije, bespovratna sredstva, programi podrÅ¡ke.",
    dbCategories: ["Poticaji za MSP", "MSP", "Mala preduzeÄ‡a", "Srednja preduzeÄ‡a"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-zaposlavanje",
    title: "ZapoÅ¡ljavanje",
    h1: "Poticaji za zapoÅ¡ljavanje u BiH",
    description: "Subvencije, grantovi i programi podrÅ¡ke za zapoÅ¡ljavanje novih radnika i struÄno osposobljavanje u BiH.",
    metaTitle: "Poticaji za zapoÅ¡ljavanje BiH 2026 â€” Subvencije za radna mjesta | TenderSistem.com",
    metaDescription: "PronaÄ‘ite poticaje za zapoÅ¡ljavanje u BiH. Subvencije za nova radna mjesta, obuke i struÄno osposobljavanje.",
    dbCategories: ["ZapoÅ¡ljavanje", "HR", "StruÄno osposobljavanje", "Obrazovanje i zapoÅ¡ljavanje"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-poljoprivredu",
    title: "Poticaji za poljoprivredu",
    h1: "Poticaji i grantovi za poljoprivredu u BiH",
    description: "Aktivni grantovi, subvencije i poticaji za poljoprivrednike, agrarne firme i ruralni razvoj u BiH.",
    metaTitle: "Poticaji za poljoprivredu BiH 2026 â€” Grantovi za farmere | TenderSistem.com",
    metaDescription: "PronaÄ‘ite aktivne poticaje za poljoprivredu u BiH. Subvencije za farmere, ruralni razvoj, agrar.",
    dbCategories: ["Poticaji za poljoprivredu", "Poljoprivreda", "Ruralni razvoj", "Agrar", "Å umarstvo"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-izvoznike",
    title: "Poticaji za izvoznike",
    h1: "Poticaji i grantovi za izvoznike u BiH",
    description: "Aktivni grantovi i poticaji za firme koje se bave izvozom iz Bosne i Hercegovine.",
    metaTitle: "Poticaji za izvoznike BiH 2026 â€” Grantovi za izvoz | TenderSistem.com",
    metaDescription: "PronaÄ‘ite aktivne poticaje za izvoznike u BiH. Subvencije za izvoz, internacionalizacija, EU trÅ¾iÅ¡te.",
    dbCategories: ["Poticaji za izvoznike", "Izvoz", "Internacionalizacija"],
    type: "poticaj",
  },
  {
    slug: "digitalizacija-i-it",
    title: "Digitalizacija i IT",
    h1: "Poticaji za digitalizaciju i IT u BiH",
    description: "Grantovi i subvencije za digitalizaciju poslovanja, IT razvoj i tehnoloÅ¡ke inovacije u BiH.",
    metaTitle: "Poticaji za digitalizaciju BiH 2026 â€” IT grantovi za firme | TenderSistem.com",
    metaDescription: "PronaÄ‘ite poticaje za digitalizaciju u BiH. Grantovi za IT, softver, digitalnu transformaciju.",
    dbCategories: ["Digitalizacija", "IT poticaji", "Informacione tehnologije poticaj", "Tehnologija"],
    type: "poticaj",
  },
  {
    slug: "energetika-i-okolis",
    title: "Energetika i ekologija",
    h1: "Poticaji za energetiku i ekologiju u BiH",
    description: "Grantovi za energetsku efikasnost, obnovljive izvore energije i ekoloÅ¡ke projekte u BiH.",
    metaTitle: "Poticaji za energetiku BiH 2026 â€” Grantovi za energetsku efikasnost | TenderSistem.com",
    metaDescription: "PronaÄ‘ite poticaje za energetiku u BiH. Grantovi za energetsku efikasnost, obnovljiva energija, ekologija.",
    dbCategories: ["Energetika", "Energetska efikasnost", "Obnovljiva energija", "Ekologija", "Zelena ekonomija"],
    type: "poticaj",
  },
  {
    slug: "startupi-i-inovacije",
    title: "Startupi i inovacije",
    h1: "Poticaji za startuppe i inovacije u BiH",
    description: "Grantovi, akceleratori i programi podrÅ¡ke za startupe, inovativne projekte i R&D u BiH.",
    metaTitle: "Poticaji za startupe BiH 2026 â€” Grantovi za inovacije | TenderSistem.com",
    metaDescription: "PronaÄ‘ite poticaje za startupe i inovacije u BiH. Grantovi za R&D, preduzetniÅ¡tvo, tehnoloÅ¡ki razvoj.",
    dbCategories: ["Inovacije", "Startupi", "PreduzetniÅ¡tvo", "R&D", "IstraÅ¾ivanje i razvoj"],
    type: "poticaj",
  },
  {
    slug: "turizam",
    title: "Turizam",
    h1: "Poticaji za turizam u BiH",
    description: "Grantovi i subvencije za turistiÄka preduzeÄ‡a, ugostiteljstvo i razvoj turizma u BiH.",
    metaTitle: "Poticaji za turizam BiH 2026 â€” Grantovi za turistiÄki sektor | TenderSistem.com",
    metaDescription: "PronaÄ‘ite poticaje za turizam u BiH. Grantovi za hotele, ugostiteljstvo, turistiÄki razvoj.",
    dbCategories: ["Turizam", "Ugostiteljstvo", "TuristiÄki sektor"],
    type: "poticaj",
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

/**
 * Canonical list of DB category values the AI should use.
 * Used in the AI prompt to ensure consistent categorisation.
 */
export const AI_CATEGORY_VALUES = [
  "Poticaji i grantovi",
  "EU grantovi",
  "Poticaji za MSP",
  "ZapoÅ¡ljavanje",
  "Poticaji za poljoprivredu",
  "Poticaji za izvoznike",
  "Digitalizacija",
  "Energetika",
  "Inovacije",
  "Turizam",
] as const;

