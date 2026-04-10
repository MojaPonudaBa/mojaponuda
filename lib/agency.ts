import type { Plan } from "@/lib/plans";

export const COMPLIMENTARY_AGENCY_EMAILS = ["agencija@tendersistem.com"];

export function isComplimentaryAgencyEmail(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? COMPLIMENTARY_AGENCY_EMAILS.includes(normalizedEmail) : false;
}

export function isAgencyPlanId(planId?: string | null): boolean {
  return planId === "agency";
}

export function isAgencyPlan(plan?: Pick<Plan, "id"> | null): boolean {
  return isAgencyPlanId(plan?.id);
}

export function resolveAuthenticatedAppPath({
  plan,
  hasCompletedCompanyProfile,
}: {
  plan?: Pick<Plan, "id"> | null;
  hasCompletedCompanyProfile: boolean;
}): string {
  if (isAgencyPlan(plan)) {
    return "/dashboard/agency";
  }

  return hasCompletedCompanyProfile ? "/dashboard" : "/onboarding";
}

export function resolveSignupRedirectPath(email?: string | null): string {
  return isComplimentaryAgencyEmail(email) ? "/dashboard/agency" : "/onboarding";
}

