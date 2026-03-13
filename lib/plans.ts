export type PlanTier = "basic" | "pro" | "agency";

export interface PlanLimits {
  maxActiveTenders: number;
  maxTeamMembers: number;
  maxCompanies: number;
  maxStorageBytes: number; // in bytes
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
  lemonSqueezyVariantId: string;
}

// 1GB = 1024 * 1024 * 1024 bytes
const GB = 1024 * 1024 * 1024;

export const PLANS: Record<PlanTier, Plan> = {
  basic: {
    id: "basic",
    name: "Osnovni",
    price: 50,
    description: "Za male firme koje povremeno sudjeluju na tenderima.",
    limits: {
      maxActiveTenders: 3,
      maxTeamMembers: 1,
      maxCompanies: 1,
      maxStorageBytes: 1 * GB,
      features: {
        advancedAnalysis: false, // Basic analysis only
        multiCompany: false,
        teamCollaboration: false,
        vaultAutoSuggest: true,
        submissionPackage: true,
      },
    },
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_BASIC || "",
  },
  pro: {
    id: "pro",
    name: "Puni",
    price: 100,
    description: "Za firme koje redovno pripremaju ponude.",
    limits: {
      maxActiveTenders: 50,
      maxTeamMembers: 5,
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
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO || "",
  },
  agency: {
    id: "agency",
    name: "Agencijski",
    price: 250,
    description: "Za konzultante i agencije koje vode više firmi.",
    limits: {
      maxActiveTenders: 1000, // Effectively unlimited
      maxTeamMembers: 20,
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
