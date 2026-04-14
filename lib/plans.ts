export type PlanTier = "basic" | "starter" | "pro" | "agency";
export type PreparationPackId = "prep_1" | "prep_5" | "prep_10" | "prep_20";

export interface PreparationPack {
  id: PreparationPackId;
  name: string;
  credits: number;
  price: number;
  description: string;
  lemonSqueezyVariantId?: string;
}

export const PRICING = {
  starter: Number(process.env.NEXT_PUBLIC_PRICE_STARTER) || 49,
  pro: Number(process.env.NEXT_PUBLIC_PRICE_PRO) || 99,
  agency: Number(process.env.NEXT_PUBLIC_PRICE_AGENCY) || 149,
  preparationSingle: Number(process.env.NEXT_PUBLIC_PRICE_PREPARATION_SINGLE) || 5,
  preparationPack5: Number(process.env.NEXT_PUBLIC_PRICE_PREPARATION_PACK_5) || 25,
  preparationPack10: Number(process.env.NEXT_PUBLIC_PRICE_PREPARATION_PACK_10) || 45,
  preparationPack20: Number(process.env.NEXT_PUBLIC_PRICE_PREPARATION_PACK_20) || 80,
  agencyExtraCompany: Number(process.env.NEXT_PUBLIC_PRICE_AGENCY_EXTRA) || 25,
};

export const PREPARATION_PACKS: Record<PreparationPackId, PreparationPack> = {
  prep_1: {
    id: "prep_1",
    name: "1 priprema",
    credits: 1,
    price: PRICING.preparationSingle,
    description: "Idealno kada vam treba samo jedna dodatna priprema odmah.",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PREP_1 || "",
  },
  prep_5: {
    id: "prep_5",
    name: "5 priprema",
    credits: 5,
    price: PRICING.preparationPack5,
    description: "Mali paket za naredni val tendera bez prekida u radu.",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PREP_5 || "",
  },
  prep_10: {
    id: "prep_10",
    name: "10 priprema",
    credits: 10,
    price: PRICING.preparationPack10,
    description: "Najprakticniji top-up kada redovno pripremate vise ponuda.",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PREP_10 || "",
  },
  prep_20: {
    id: "prep_20",
    name: "20 priprema",
    credits: 20,
    price: PRICING.preparationPack20,
    description: "Veci paket za timove i agencije koje zele komotnu rezervu.",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PREP_20 || "",
  },
};

export interface PlanLimits {
  maxActiveTenders: number;
  maxTeamMembers: number;
  maxCompanies: number;
  maxStorageBytes: number;
  features: {
    advancedAnalysis: boolean;
    multiCompany: boolean;
    teamCollaboration: boolean;
    vaultAutoSuggest: boolean;
    submissionPackage: boolean;
  };
}

export interface PlanPreparationPolicy {
  includedPerCycle: number;
  scope: "account" | "company";
  allowsTopUps: boolean;
  payAsYouGoPrice: number | null;
  monthlyLabel: string;
}

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  description: string;
  limits: PlanLimits;
  preparation: PlanPreparationPolicy;
  features: string[];
  cta?: string;
  lemonSqueezyVariantId?: string;
}

const GB = 1073741824;

export const PLANS: Record<PlanTier, Plan> = {
  basic: {
    id: "basic",
    name: "Besplatni",
    price: 0,
    description: "Provjerite da li postoje poslovi za vasu firmu.",
    limits: {
      maxActiveTenders: 0,
      maxTeamMembers: 1,
      maxCompanies: 1,
      maxStorageBytes: 0,
      features: {
        advancedAnalysis: false,
        multiCompany: false,
        teamCollaboration: false,
        vaultAutoSuggest: false,
        submissionPackage: false,
      },
    },
    preparation: {
      includedPerCycle: 0,
      scope: "account",
      allowsTopUps: false,
      payAsYouGoPrice: null,
      monthlyLabel: "Bez ukljucenih priprema ponuda",
    },
    features: ["Dokaz da prilike postoje"],
    cta: "Provjeri prilike",
  },
  starter: {
    id: "starter",
    name: "Osnovni",
    price: PRICING.starter,
    description: "Za firme koje zele pratiti prilike i reagovati na vrijeme.",
    limits: {
      maxActiveTenders: 50,
      maxTeamMembers: 1,
      maxCompanies: 1,
      maxStorageBytes: 1 * GB,
      features: {
        advancedAnalysis: false,
        multiCompany: false,
        teamCollaboration: false,
        vaultAutoSuggest: true,
        submissionPackage: false,
      },
    },
    preparation: {
      includedPerCycle: 0,
      scope: "account",
      allowsTopUps: true,
      payAsYouGoPrice: PRICING.preparationSingle,
      monthlyLabel: "Priprema ponude po potrebi",
    },
    features: [
      "Vidite sve tendere za vasu firmu",
      "Dobijate email kad izade novi tender",
      "Vidite zasto je tender za vas",
      `Svaka priprema ponude ${PRICING.preparationSingle} KM`,
      "Mozete kupiti i pakete dodatnih priprema unaprijed",
    ],
    cta: "Odaberi paket",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_STARTER || "",
  },
  pro: {
    id: "pro",
    name: "Puni Paket",
    price: PRICING.pro,
    description: "Za firme koje zele uzimati tendere bez greske.",
    limits: {
      maxActiveTenders: 1000,
      maxTeamMembers: 3,
      maxCompanies: 1,
      maxStorageBytes: 10 * GB,
      features: {
        advancedAnalysis: true,
        multiCompany: false,
        teamCollaboration: true,
        vaultAutoSuggest: true,
        submissionPackage: true,
      },
    },
    preparation: {
      includedPerCycle: 20,
      scope: "account",
      allowsTopUps: true,
      payAsYouGoPrice: null,
      monthlyLabel: "20 besplatnih priprema ponude mjesecno",
    },
    features: [
      "Sve iz Osnovnog paketa +",
      "20 besplatnih priprema ponude svakog mjeseca",
      "Pratite koliko ste priprema iskoristili u trenutnom ciklusu",
      "Dodatne pripreme kupujete samo kada vam stvarno zatrebaju",
      "Vidite sta nedostaje prije predaje",
      "Svi dokumenti i rokovi na jednom mjestu",
      "Pracenje nadolazecih tendera",
    ],
    cta: "Pocni bez ogranicenja",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO || "",
  },
  agency: {
    id: "agency",
    name: "Agencijski",
    price: PRICING.agency,
    description: "Za agencije koje vode vise firmi.",
    limits: {
      maxActiveTenders: 5000,
      maxTeamMembers: 10,
      maxCompanies: 10,
      maxStorageBytes: 100 * GB,
      features: {
        advancedAnalysis: true,
        multiCompany: true,
        teamCollaboration: true,
        vaultAutoSuggest: true,
        submissionPackage: true,
      },
    },
    preparation: {
      includedPerCycle: 10,
      scope: "company",
      allowsTopUps: true,
      payAsYouGoPrice: null,
      monthlyLabel: "10 besplatnih priprema mjesecno po klijentu",
    },
    features: [
      "Sve iz Punog paketa +",
      "10 besplatnih priprema mjesecno za svakog klijenta / firmu",
      "Vodite vise firmi sa jednog mjesta",
      "Poseban profil za svakog klijenta",
      "Odvojena kontrola i pregled po klijentu",
      `Dodatna firma samo ${PRICING.agencyExtraCompany} KM`,
    ],
    cta: "Kontaktirajte nas",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_AGENCY || "",
  },
};

export const DEFAULT_PLAN = PLANS.basic;

export function getPlanFromVariantId(variantId: string | null): Plan {
  if (!variantId) return DEFAULT_PLAN;

  if (variantId in PLANS) {
    return PLANS[variantId as PlanTier];
  }

  const plan = Object.values(PLANS).find((item) => item.lemonSqueezyVariantId === variantId);
  return plan || DEFAULT_PLAN;
}

export function getPreparationPackFromVariantId(variantId: string | null): PreparationPack | null {
  if (!variantId) return null;

  const pack = Object.values(PREPARATION_PACKS).find((item) => item.lemonSqueezyVariantId === variantId);
  return pack ?? null;
}

export function getPreparationPacksForPlan(planId: PlanTier): PreparationPack[] {
  if (planId === "basic") return [];
  if (planId === "starter") {
    return [
      PREPARATION_PACKS.prep_1,
      PREPARATION_PACKS.prep_5,
      PREPARATION_PACKS.prep_10,
      PREPARATION_PACKS.prep_20,
    ];
  }

  return [
    PREPARATION_PACKS.prep_5,
    PREPARATION_PACKS.prep_10,
    PREPARATION_PACKS.prep_20,
  ];
}
