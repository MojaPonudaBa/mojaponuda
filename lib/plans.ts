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
    name: "Starter",
    price: 39,
    description: "Za male firme i početnike koji se rjeđe prijavljuju na tendere, ali žele uštedjeti vrijeme.",
    limits: {
      maxActiveTenders: 5,
      maxTeamMembers: 1,
      maxCompanies: 1,
      maxStorageBytes: 1 * GB,
      features: {
        advancedAnalysis: false,
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
    name: "Pro",
    price: 99,
    description: "Za firme koje redovno pripremaju ponude i žele maksimalnu efikasnost i zaštitu od grešaka.",
    limits: {
      maxActiveTenders: 50,
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
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO || "",
  },
  agency: {
    id: "agency",
    name: "Agencijski",
    price: 249,
    description: "Za konsultante i korporacije koje vode tendere za više firmi pod jednim krovom.",
    limits: {
      maxActiveTenders: 1000,
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
