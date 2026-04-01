/**
 * Definicija SEO kategorija za poticaje i grantove.
 * Samo poticaji — tenderi su isključeni iz javnih stranica.
 * dbCategories NESMIJU se preklapati između kategorija.
 *
 * AI kategorije koje se dodjeljuju novim postovima:
 *   "Poticaji i grantovi" | "EU grantovi" | "Poticaji za MSP" |
 *   "Poticaji za poljoprivredu" | "Poticaji za izvoznike" |
 *   "Digitalizacija" | "Energetika" | "Zapošljavanje" |
 *   "Inovacije" | "Turizam"
 */

export interface OpportunityCategory {
  slug: string;
  title: string;
  h1: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  /** DB category values that map to this SEO category — must not overlap across categories */
  dbCategories: string[];
  type?: "poticaj";
}

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  {
    slug: "svi-poticaji",
    title: "Svi poticaji",
    h1: "Svi poticaji i grantovi u BiH",
    description: "Kompletna lista aktivnih poticaja, grantova i subvencija za firme u Bosni i Hercegovini. Federalni, kantonalni i EU programi.",
    metaTitle: "Svi poticaji BiH 2026 — Grantovi i subvencije za firme | MojaPonuda.ba",
    metaDescription: "Pronađite sve aktivne poticaje i grantove u BiH. Federalni, kantonalni i EU programi podrške za firme. Svakodnevno ažurirano.",
    dbCategories: ["Poticaji i grantovi", "Ostali poticaji", "Subvencije", "Lokalni poticaji"],
    type: "poticaj",
  },
  {
    slug: "eu-grantovi",
    title: "EU grantovi",
    h1: "EU grantovi i fondovi za firme u BiH",
    description: "Europski grantovi, IPA fondovi i EU programi dostupni firmama u Bosni i Hercegovini.",
    metaTitle: "EU grantovi BiH 2026 — Europski fondovi za firme | MojaPonuda.ba",
    metaDescription: "Pronađite EU grantove i fondove dostupne firmama u BiH. IPA, Horizon, UNDP i drugi programi.",
    dbCategories: ["EU grantovi", "Europski fondovi", "IPA", "UNDP", "EU fondovi"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-msp",
    title: "Poticaji za MSP",
    h1: "Poticaji i grantovi za mala i srednja preduzeća u BiH",
    description: "Aktivni grantovi, subvencije i poticaji za mala i srednja preduzeća u Bosni i Hercegovini.",
    metaTitle: "Poticaji za MSP BiH 2026 — Grantovi za mala preduzeća | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne poticaje i grantove za MSP u BiH. Subvencije, bespovratna sredstva, programi podrške.",
    dbCategories: ["Poticaji za MSP", "MSP", "Mala preduzeća", "Srednja preduzeća"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-zaposlavanje",
    title: "Zapošljavanje",
    h1: "Poticaji za zapošljavanje u BiH",
    description: "Subvencije, grantovi i programi podrške za zapošljavanje novih radnika i stručno osposobljavanje u BiH.",
    metaTitle: "Poticaji za zapošljavanje BiH 2026 — Subvencije za radna mjesta | MojaPonuda.ba",
    metaDescription: "Pronađite poticaje za zapošljavanje u BiH. Subvencije za nova radna mjesta, obuke i stručno osposobljavanje.",
    dbCategories: ["Zapošljavanje", "HR", "Stručno osposobljavanje", "Obrazovanje i zapošljavanje"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-poljoprivredu",
    title: "Poticaji za poljoprivredu",
    h1: "Poticaji i grantovi za poljoprivredu u BiH",
    description: "Aktivni grantovi, subvencije i poticaji za poljoprivrednike, agrarne firme i ruralni razvoj u BiH.",
    metaTitle: "Poticaji za poljoprivredu BiH 2026 — Grantovi za farmere | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne poticaje za poljoprivredu u BiH. Subvencije za farmere, ruralni razvoj, agrar.",
    dbCategories: ["Poticaji za poljoprivredu", "Poljoprivreda", "Ruralni razvoj", "Agrar", "Šumarstvo"],
    type: "poticaj",
  },
  {
    slug: "poticaji-za-izvoznike",
    title: "Poticaji za izvoznike",
    h1: "Poticaji i grantovi za izvoznike u BiH",
    description: "Aktivni grantovi i poticaji za firme koje se bave izvozom iz Bosne i Hercegovine.",
    metaTitle: "Poticaji za izvoznike BiH 2026 — Grantovi za izvoz | MojaPonuda.ba",
    metaDescription: "Pronađite aktivne poticaje za izvoznike u BiH. Subvencije za izvoz, internacionalizacija, EU tržište.",
    dbCategories: ["Poticaji za izvoznike", "Izvoz", "Internacionalizacija"],
    type: "poticaj",
  },
  {
    slug: "digitalizacija-i-it",
    title: "Digitalizacija i IT",
    h1: "Poticaji za digitalizaciju i IT u BiH",
    description: "Grantovi i subvencije za digitalizaciju poslovanja, IT razvoj i tehnološke inovacije u BiH.",
    metaTitle: "Poticaji za digitalizaciju BiH 2026 — IT grantovi za firme | MojaPonuda.ba",
    metaDescription: "Pronađite poticaje za digitalizaciju u BiH. Grantovi za IT, softver, digitalnu transformaciju.",
    dbCategories: ["Digitalizacija", "IT poticaji", "Informacione tehnologije poticaj", "Tehnologija"],
    type: "poticaj",
  },
  {
    slug: "energetika-i-okolis",
    title: "Energetika i ekologija",
    h1: "Poticaji za energetiku i ekologiju u BiH",
    description: "Grantovi za energetsku efikasnost, obnovljive izvore energije i ekološke projekte u BiH.",
    metaTitle: "Poticaji za energetiku BiH 2026 — Grantovi za energetsku efikasnost | MojaPonuda.ba",
    metaDescription: "Pronađite poticaje za energetiku u BiH. Grantovi za energetsku efikasnost, obnovljiva energija, ekologija.",
    dbCategories: ["Energetika", "Energetska efikasnost", "Obnovljiva energija", "Ekologija", "Zelena ekonomija"],
    type: "poticaj",
  },
  {
    slug: "startupi-i-inovacije",
    title: "Startupi i inovacije",
    h1: "Poticaji za startuppe i inovacije u BiH",
    description: "Grantovi, akceleratori i programi podrške za startupe, inovativne projekte i R&D u BiH.",
    metaTitle: "Poticaji za startupe BiH 2026 — Grantovi za inovacije | MojaPonuda.ba",
    metaDescription: "Pronađite poticaje za startupe i inovacije u BiH. Grantovi za R&D, preduzetništvo, tehnološki razvoj.",
    dbCategories: ["Inovacije", "Startupi", "Preduzetništvo", "R&D", "Istraživanje i razvoj"],
    type: "poticaj",
  },
  {
    slug: "turizam",
    title: "Turizam",
    h1: "Poticaji za turizam u BiH",
    description: "Grantovi i subvencije za turistička preduzeća, ugostiteljstvo i razvoj turizma u BiH.",
    metaTitle: "Poticaji za turizam BiH 2026 — Grantovi za turistički sektor | MojaPonuda.ba",
    metaDescription: "Pronađite poticaje za turizam u BiH. Grantovi za hotele, ugostiteljstvo, turistički razvoj.",
    dbCategories: ["Turizam", "Ugostiteljstvo", "Turistički sektor"],
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
  "Zapošljavanje",
  "Poticaji za poljoprivredu",
  "Poticaji za izvoznike",
  "Digitalizacija",
  "Energetika",
  "Inovacije",
  "Turizam",
] as const;
