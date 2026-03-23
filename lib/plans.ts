export type PlanTier = "basic" | "starter" | "pro" | "agency";

export const PRICING = {
  starter: Number(process.env.NEXT_PUBLIC_PRICE_STARTER) || 49,
  pro: Number(process.env.NEXT_PUBLIC_PRICE_PRO) || 99,
  agency: Number(process.env.NEXT_PUBLIC_PRICE_AGENCY) || 149,
  tenderUnlock: Number(process.env.NEXT_PUBLIC_PRICE_TENDER_UNLOCK) || 15,
  agencyExtraCompany: Number(process.env.NEXT_PUBLIC_PRICE_AGENCY_EXTRA) || 25,
};

export interface PlanLimits {
  maxActiveTenders: number; // For freemium/starter this might be high if we just let them 'save' for feed purposes
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

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  description: string;
  limits: PlanLimits;
  features: string[]; // For UI display
  cta?: string;
  lemonSqueezyVariantId?: string;
}

// 1GB = 1024 * 1024 * 1024 bytes
const GB = 1073741824;

export const PLANS: Record<PlanTier, Plan> = {
  // Basic = Freemium now (Signal only)
  basic: {
    id: "basic",
    name: "Besplatni",
    price: 0,
    description: "Provjerite da li postoje poslovi za vašu firmu.",
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
    features: ["Dokaz da prilike postoje"],
    cta: "Provjeri prilike",
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: PRICING.starter,
    description: "Za firme koje žele redovno pratiti prilike.",
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
    features: [
      "Vidite sve tendere koji odgovaraju vašoj firmi",
      "Dobijate email obavijesti o novim tenderima",
      "Jasno objašnjenje zašto je tender relevantan",
      `Priprema ponude po potrebi (${PRICING.tenderUnlock} KM po tenderu)`,
    ],
    cta: "Kreni koristiti",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_STARTER || "",
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: PRICING.pro,
    description: "Za firme koje žele uzimati tendere bez greške.",
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
    features: [
      "Neograničena priprema ponuda",
      "Tačno vidite šta nedostaje prije predaje",
      "Svi dokumenti i rokovi na jednom mjestu",
      "Smanjen rizik odbijanja ponude",
    ],
    cta: "Uzmi potpunu kontrolu",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO || "",
  },
  agency: {
    id: "agency",
    name: "Agencijski",
    price: PRICING.agency,
    description: "Za agencije i firme koje vode više klijenata.",
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
    features: [
      "Upravljanje desetinama klijenata sa jednog mjesta",
      "Vlastiti profil za svaku firmu klijenta",
      "Svi AI benefiti bez ograničenja",
      `Dodatna firma samo ${PRICING.agencyExtraCompany} KM`,
      "Prioritetna podrška",
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
  
  const plan = Object.values(PLANS).find(
    (p) => p.lemonSqueezyVariantId === variantId
  );
  
  return plan || DEFAULT_PLAN;
}
