export interface ProfileOption {
  id: string;
  label: string;
  description: string;
}

export interface OfferingCategoryOption extends ProfileOption {
  focusId: string;
}

export interface ProfileOptionGroup {
  id: string;
  label: string;
  description: string;
  optionIds: string[];
}

export const PRIMARY_INDUSTRY_OPTIONS: ProfileOption[] = [
  {
    id: "construction",
    label: "Građevina i infrastruktura",
    description: "Niskogradnja, visokogradnja, rekonstrukcije i infrastrukturni projekti.",
  },
  {
    id: "it",
    label: "IT i digitalna rješenja",
    description: "Softver, licence, hardver, mreže, cloud i digitalizacija.",
  },
  {
    id: "equipment",
    label: "Oprema i roba",
    description: "Uredska, školska, industrijska i druga oprema za isporuku.",
  },
  {
    id: "medical",
    label: "Medicinska i laboratorijska oprema",
    description: "Medicinski uređaji, potrošni materijal i laboratorijska rješenja.",
  },
  {
    id: "maintenance",
    label: "Održavanje i servis",
    description: "Servisiranje opreme, održavanje sistema, podrška i interventni radovi.",
  },
  {
    id: "consulting",
    label: "Konsalting, projektovanje i nadzor",
    description: "Projektovanje, stručni nadzor, edukacije, pravne i savjetodavne usluge.",
  },
  {
    id: "logistics",
    label: "Transport, logistika i komunalne usluge",
    description: "Prevoz, komunalne usluge, zimsko održavanje, odvoz i logistika.",
  },
  {
    id: "security_energy",
    label: "Sigurnost, zaštita i energija",
    description: "Video nadzor, zaštitarske usluge, elektro i energetski sistemi.",
  },
  {
    id: "facilities_hospitality",
    label: "Objekti, higijena i ugostiteljstvo",
    description: "Čišćenje, higijenski program, prehrana, catering i podrška objektima.",
  },
  {
    id: "communications_media",
    label: "Komunikacije, štampa i događaji",
    description: "Štampa, promotivni materijali, kampanje, audio-video i organizacija događaja.",
  },
];

export const OFFERING_CATEGORY_OPTIONS: OfferingCategoryOption[] = [
  {
    id: "software_licenses",
    label: "Softver i licence",
    description: "ERP, DMS, antivirus, licence, SaaS i aplikativna rješenja.",
    focusId: "it",
  },
  {
    id: "it_hardware",
    label: "IT oprema i mreže",
    description: "Računari, serveri, printeri, mrežna oprema i periferija.",
    focusId: "it",
  },
  {
    id: "telecom_av",
    label: "Telekomunikacije i audio-video sistemi",
    description: "Telefonija, konferencijski sistemi, video zidovi, razglas i AV oprema.",
    focusId: "it",
  },
  {
    id: "cloud_cyber_data",
    label: "Cloud, cyber sigurnost i podaci",
    description: "Cloud infrastruktura, backup, SIEM, cyber zaštita i data platforme.",
    focusId: "it",
  },
  {
    id: "construction_works",
    label: "Građevinski radovi",
    description: "Izvođenje radova, rekonstrukcije, sanacije i adaptacije.",
    focusId: "construction",
  },
  {
    id: "electro_mechanical",
    label: "Elektro i mašinski radovi",
    description: "Instalacije, mašinske pozicije, HVAC i tehnički sistemi.",
    focusId: "construction",
  },
  {
    id: "design_supervision",
    label: "Projektovanje i nadzor",
    description: "Glavni projekti, idejna rješenja, stručni nadzor i revizije.",
    focusId: "consulting",
  },
  {
    id: "maintenance_support",
    label: "Održavanje i podrška",
    description: "Servis, helpdesk, održavanje opreme i ugovori o podršci.",
    focusId: "maintenance",
  },
  {
    id: "office_school_equipment",
    label: "Uredska i školska oprema",
    description: "Namještaj, učionička oprema, uredski materijal i enterijer.",
    focusId: "equipment",
  },
  {
    id: "industrial_tools_machinery",
    label: "Industrijska oprema i alati",
    description: "Mašine, alati, radionice, rezervni dijelovi i tehnička oprema.",
    focusId: "equipment",
  },
  {
    id: "furniture_interior",
    label: "Namještaj i enterijerska oprema",
    description: "Kancelarijski, školski, zdravstveni i drugi enterijerski program.",
    focusId: "equipment",
  },
  {
    id: "medical_supplies",
    label: "Medicinska oprema i potrošni materijal",
    description: "Medicinski uređaji, laboratorijski materijal i potrošna roba.",
    focusId: "medical",
  },
  {
    id: "laboratory_diagnostics",
    label: "Laboratorija i dijagnostika",
    description: "Laboratorijska oprema, dijagnostički sistemi, reagensi i analizatori.",
    focusId: "medical",
  },
  {
    id: "vehicles_transport",
    label: "Vozila i transport",
    description: "Putnička i teretna vozila, rezervni dijelovi i transportne usluge.",
    focusId: "logistics",
  },
  {
    id: "utility_waste_winter",
    label: "Komunalne, zimske i odvoz usluge",
    description: "Odvoz otpada, komunalne usluge, zimsko održavanje i terenska logistika.",
    focusId: "logistics",
  },
  {
    id: "cleaning_hygiene",
    label: "Čišćenje i higijena",
    description: "Usluge čišćenja, hemija, higijenski i sanitarni program.",
    focusId: "facilities_hospitality",
  },
  {
    id: "food_catering",
    label: "Hrana i catering",
    description: "Prehrambeni artikli, catering, kantine i ugostiteljske usluge.",
    focusId: "facilities_hospitality",
  },
  {
    id: "security_video",
    label: "Sigurnost i video nadzor",
    description: "Alarmni sistemi, video nadzor, zaštitarske i sigurnosne usluge.",
    focusId: "security_energy",
  },
  {
    id: "fuel_energy",
    label: "Gorivo, energenti i energetski sistemi",
    description: "Gorivo, lož ulje, energenti, agregati i energetska infrastruktura.",
    focusId: "security_energy",
  },
  {
    id: "legal_finance_consulting",
    label: "Pravne, finansijske i savjetodavne usluge",
    description: "Pravno savjetovanje, revizija, računovodstvo, due diligence i consulting.",
    focusId: "consulting",
  },
  {
    id: "training_research",
    label: "Edukacije, istraživanja i stručne obuke",
    description: "Obuke, certifikacije, istraživanja tržišta i stručni razvoj kadra.",
    focusId: "consulting",
  },
  {
    id: "printing_marketing_events",
    label: "Štampa, marketing i događaji",
    description: "Promotivni materijali, štampa, kampanje, sajmovi i organizacija događaja.",
    focusId: "communications_media",
  },
];

export const OFFERING_CATEGORY_GROUPS: ProfileOptionGroup[] = PRIMARY_INDUSTRY_OPTIONS.map(
  (focusOption) => ({
    id: focusOption.id,
    label: focusOption.label,
    description: focusOption.description,
    optionIds: OFFERING_CATEGORY_OPTIONS.filter(
      (option) => option.focusId === focusOption.id
    ).map((option) => option.id),
  })
).filter((group) => group.optionIds.length > 0);

export const TENDER_TYPE_OPTIONS: ProfileOption[] = [
  {
    id: "goods",
    label: "Robe",
    description: "Isporuka opreme, potrošnog materijala i druge robe.",
  },
  {
    id: "services",
    label: "Usluge",
    description: "Održavanje, podrška, konsultantske i druge usluge.",
  },
  {
    id: "works",
    label: "Radovi",
    description: "Građevinski, infrastrukturni i izvedbeni radovi.",
  },
];

const PRIMARY_INDUSTRY_KEYWORDS: Record<string, string[]> = {
  construction: ["građevin", "izgradnj", "rekonstrukcij", "sanacij", "adaptacij"],
  it: ["softver", "licenc", "server", "računar", "informatičk"],
  equipment: ["namještaj", "inventar", "mašin", "alat", "uredsk"],
  medical: ["medicinsk", "laboratorij", "dijagnostik", "reagens"],
  maintenance: ["održavanj", "servisiranj", "helpdesk", "intervencij"],
  consulting: ["projektovanj", "nadzor", "savjetovanj", "revizij", "obuk"],
  logistics: ["transport", "prevoz", "vozil", "odvoz", "zimsk"],
  security_energy: ["videonadzor", "alarm", "zaštit", "goriv", "energent"],
  facilities_hospitality: ["čišćenj", "higijen", "dezinfekcij", "catering"],
  communications_media: ["štamp", "marketing", "brendiranj", "događaj"],
};

const OFFERING_CATEGORY_KEYWORDS: Record<string, string[]> = {
  software_licenses: ["softver", "licenc", "erp", "dms", "saas", "aplikacij"],
  it_hardware: ["server", "računar", "printer", "switch", "router", "firewall", "mrežna oprema"],
  telecom_av: ["telekom", "telefonij", "konferencij", "audio", "video", "razglas"],
  cloud_cyber_data: ["cloud", "backup", "cyber sigurnost", "siem", "data platform", "disaster recovery"],
  construction_works: ["izgradnj", "rekonstrukcij", "sanacij", "adaptacij", "građevin", "radov"],
  electro_mechanical: ["elektroinstalacij", "mašinsk", "instalacij", "hvac", "grijanj", "hlađenj"],
  design_supervision: ["projektovanj", "nadzor", "idejn", "glavn", "revizij"],
  maintenance_support: ["održavanj", "servisiranj", "tehnička podrška", "helpdesk", "intervencij"],
  office_school_equipment: ["uredsk", "kancelarij", "školsk", "namještaj", "inventar"],
  industrial_tools_machinery: ["industrijsk", "alat", "mašin", "rezervn", "radionic"],
  furniture_interior: ["namještaj", "stolic", "stol", "ormar", "enterijer"],
  medical_supplies: ["medicinsk", "potrošn", "instrument", "sanitetsk", "uređaj"],
  laboratory_diagnostics: ["laboratorij", "dijagnostik", "reagens", "analizator"],
  vehicles_transport: ["vozil", "automobil", "kombi", "kamion", "transport", "prevoz"],
  utility_waste_winter: ["komunaln", "otpad", "odvoz", "zimsk", "održavanj"],
  cleaning_hygiene: ["čišćenj", "higijen", "dezinfekcij", "sanitarn", "hemij"],
  food_catering: ["hran", "prehramben", "catering", "ugostitelj", "obrok"],
  security_video: ["sigurnost", "zaštit", "alarm", "video", "nadzor", "videonadzor"],
  fuel_energy: ["goriv", "lož", "energ", "elektroenergetsk", "agregat"],
  legal_finance_consulting: ["pravn", "finansij", "računovodstv", "revizij", "savjetovanj"],
  training_research: ["obuk", "edukacij", "certifikacij", "istraživanj", "seminar"],
  printing_marketing_events: ["štamp", "marketing", "promotivn", "brendiranj", "događaj"],
};

const TENDER_TYPE_KEYWORDS: Record<string, string[]> = {
  goods: [],
  services: [],
  works: [],
};

const SEARCH_KEYWORD_STOP_WORDS = new Set([
  "firma",
  "firme",
  "naša",
  "naše",
  "naš",
  "njihov",
  "njihove",
  "koja",
  "koje",
  "koji",
  "kako",
  "gdje",
  "kroz",
  "radi",
  "radimo",
  "vrste",
  "vrsta",
  "ponuda",
  "ponude",
  "usluga",
  "usluge",
  "roba",
  "radova",
  "opis",
  "fokus",
  "profil",
  "tender",
  "tendere",
  "bosna",
  "hercegovina",
  "cijela",
  "bih",
]);

export interface StructuredCompanyProfile {
  version: 1;
  primaryIndustry: string | null;
  offeringCategories: string[];
  preferredTenderTypes: string[];
  companyDescription: string | null;
}

export interface ParsedCompanyProfile {
  primaryIndustry: string | null;
  offeringCategories: string[];
  preferredTenderTypes: string[];
  companyDescription: string | null;
  legacyIndustryText: string | null;
}

const optionLookup = new Map(
  [...PRIMARY_INDUSTRY_OPTIONS, ...OFFERING_CATEGORY_OPTIONS, ...TENDER_TYPE_OPTIONS].map((option) => [
    option.id,
    option,
  ])
);

const genericProfileKeywordTerms = new Set(
  [...PRIMARY_INDUSTRY_OPTIONS, ...OFFERING_CATEGORY_OPTIONS, ...TENDER_TYPE_OPTIONS]
    .map((option) => option.label)
    .map((term) =>
      term
        .trim()
        .toLowerCase()
        .replace(/[“”"']/g, "")
        .replace(/[(),.;:/\\]+/g, " ")
        .replace(/\s+/g, " ")
    )
);

const AMBIGUOUS_SINGLE_WORD_KEYWORD_PATTERNS = [
  /^mrež/i,
  /^oprem/i,
  /^nabavk/i,
  /^radov/i,
  /^uslug/i,
  /^servis$/i,
  /^podršk/i,
  /^sistem/i,
  /^rješenj/i,
  /^digitalizacij/i,
  /^podat$/i,
  /^data$/i,
];

const offeringCategoryLookup = new Map(
  OFFERING_CATEGORY_OPTIONS.map((option) => [option.id, option])
);

function normalizeSearchKeywordTerm(term: string): string | null {
  const normalized = term
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[(),.;:/\\]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized || normalized.length < 3) {
    return null;
  }

  return normalized;
}

function uniqueSearchKeywordTerms(terms: Array<string | null | undefined>): string[] {
  return [...new Set(terms.map((term) => (term ? normalizeSearchKeywordTerm(term) : null)).filter(Boolean) as string[])];
}

function isAmbiguousSingleWordKeyword(term: string): boolean {
  if (term.includes(" ")) {
    return false;
  }

  return AMBIGUOUS_SINGLE_WORD_KEYWORD_PATTERNS.some((pattern) => pattern.test(term));
}

function extractDescriptionKeywordTerms(description: string | null | undefined): string[] {
  if (!description?.trim()) {
    return [];
  }

  const words = description
    .split(/[^a-zA-Z0-9čćžšđČĆŽŠĐ-]+/)
    .map((word) => normalizeSearchKeywordTerm(word))
    .filter((word): word is string => typeof word === "string" && word.length >= 5)
    .filter((word) => !SEARCH_KEYWORD_STOP_WORDS.has(word))
    .filter((word) => !isAmbiguousSingleWordKeyword(word));

  return uniqueSearchKeywordTerms(words).slice(0, 8);
}

export function sanitizeSearchKeywords(terms: Array<string | null | undefined>): string[] {
  return uniqueSearchKeywordTerms(terms)
    .filter((term) => !genericProfileKeywordTerms.has(term))
    .filter((term) => !SEARCH_KEYWORD_STOP_WORDS.has(term))
    .slice(0, 24);
}

export function buildRecommendationKeywords({
  explicitKeywords = [],
  profile,
}: {
  explicitKeywords?: Array<string | null | undefined>;
  profile: ParsedCompanyProfile;
}): string[] {
  return sanitizeSearchKeywords([
    ...explicitKeywords,
    ...buildProfileKeywordSeeds(profile),
  ])
    .filter((term) => !isAmbiguousSingleWordKeyword(term))
    .slice(0, 18);
}

export function derivePrimaryIndustry(
  offeringCategories: string[],
  fallbackPrimaryIndustry?: string | null
): string | null {
  if (offeringCategories.length === 0) {
    return fallbackPrimaryIndustry ?? null;
  }

  const counts = new Map<string, number>();

  for (const categoryId of offeringCategories) {
    const focusId = offeringCategoryLookup.get(categoryId)?.focusId;

    if (!focusId) {
      continue;
    }

    counts.set(focusId, (counts.get(focusId) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return fallbackPrimaryIndustry ?? null;
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallbackPrimaryIndustry ?? null;
}

export function serializeCompanyProfile(profile: ParsedCompanyProfile): string | null {
  const normalized: StructuredCompanyProfile = {
    version: 1,
    primaryIndustry: derivePrimaryIndustry(
      profile.offeringCategories,
      profile.primaryIndustry
    ),
    offeringCategories: [...new Set(profile.offeringCategories)],
    preferredTenderTypes: [...new Set(profile.preferredTenderTypes)],
    companyDescription: profile.companyDescription?.trim() || null,
  };

  if (
    !normalized.primaryIndustry &&
    normalized.offeringCategories.length === 0 &&
    normalized.preferredTenderTypes.length === 0 &&
    !normalized.companyDescription &&
    !profile.legacyIndustryText?.trim()
  ) {
    return null;
  }

  return JSON.stringify(normalized);
}

export function parseCompanyProfile(industry: string | null | undefined): ParsedCompanyProfile {
  if (!industry?.trim()) {
    return {
      primaryIndustry: null,
      offeringCategories: [],
      preferredTenderTypes: [],
      companyDescription: null,
      legacyIndustryText: null,
    };
  }

  try {
    const parsed = JSON.parse(industry) as Partial<StructuredCompanyProfile>;
    if (parsed.version === 1) {
      return {
        primaryIndustry: parsed.primaryIndustry ?? null,
        offeringCategories: parsed.offeringCategories ?? [],
        preferredTenderTypes: parsed.preferredTenderTypes ?? [],
        companyDescription: parsed.companyDescription ?? null,
        legacyIndustryText: null,
      };
    }
  } catch {
    return {
      primaryIndustry: null,
      offeringCategories: [],
      preferredTenderTypes: [],
      companyDescription: null,
      legacyIndustryText: industry,
    };
  }

  return {
    primaryIndustry: null,
    offeringCategories: [],
    preferredTenderTypes: [],
    companyDescription: null,
    legacyIndustryText: industry,
  };
}

export function getProfileOptionLabel(optionId: string): string {
  return optionLookup.get(optionId)?.label ?? optionId;
}

export function getPreferredContractTypes(preferredTenderTypes: string[]): string[] {
  const mapping: Record<string, string> = {
    goods: "Robe",
    services: "Usluge",
    works: "Radovi",
  };

  return preferredTenderTypes
    .map((item) => mapping[item])
    .filter((item): item is string => Boolean(item));
}

export function buildProfileKeywordSeeds(profile: ParsedCompanyProfile): string[] {
  const derivedPrimaryIndustry = derivePrimaryIndustry(
    profile.offeringCategories,
    profile.primaryIndustry
  );

  return sanitizeSearchKeywords([
    ...(derivedPrimaryIndustry ? PRIMARY_INDUSTRY_KEYWORDS[derivedPrimaryIndustry] ?? [] : []),
    ...profile.offeringCategories.flatMap((item) => OFFERING_CATEGORY_KEYWORDS[item] ?? []),
    ...profile.preferredTenderTypes.flatMap((item) => TENDER_TYPE_KEYWORDS[item] ?? []),
    ...extractDescriptionKeywordTerms(profile.companyDescription ?? profile.legacyIndustryText),
  ]);
}

export function buildProfileContextText({
  description,
  primaryIndustry,
  offeringCategories,
  preferredTenderTypes,
  regions,
}: {
  description: string;
  primaryIndustry: string | null;
  offeringCategories: string[];
  preferredTenderTypes: string[];
  regions: string[];
}): string {
  const derivedPrimaryIndustry = derivePrimaryIndustry(offeringCategories, primaryIndustry);

  const lines = [
    derivedPrimaryIndustry ? `Fokus firme: ${getProfileOptionLabel(derivedPrimaryIndustry)}` : null,
    offeringCategories.length > 0
      ? `Ponuda firme: ${offeringCategories.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    preferredTenderTypes.length > 0
      ? `Vrste tendera: ${preferredTenderTypes.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    regions.length > 0 ? `Regije rada: ${regions.join(", ")}` : "Regije rada: cijela Bosna i Hercegovina",
    `Opis firme: ${description}`,
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}
