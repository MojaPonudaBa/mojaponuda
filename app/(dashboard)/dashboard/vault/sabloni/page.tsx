import { redirect } from "next/navigation";

import { DocumentTemplatesClient } from "@/components/dashboard/document-templates-client";
import { isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/types/db-aliases";

export default async function VaultTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = isAgencyPlan(plan);
  const isDemoAccount = isDemoUser(user.email);

  if (!isAgency && !isDemoAccount) {
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, jib, industry, keywords")
      .eq("user_id", user.id)
      .maybeSingle();

    const company = companyData as Company | null;
    if (!isCompanyProfileComplete(company)) redirect("/onboarding");
  }

  return <DocumentTemplatesClient />;
}
