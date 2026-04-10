import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/types/database";
import { getDemoCompanyDefaults, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { OnboardingValueFirstForm } from "@/components/onboarding-value-first-form";
import { isAgencyPlan } from "@/lib/agency";
import { getSubscriptionStatus } from "@/lib/subscription";
import { TenderSistemLogo } from "@/components/brand/tender-sistem-logo";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (isAgencyPlan(plan)) {
    redirect("/dashboard/agency");
  }

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = data as Company | null;
  const demoDefaults = isDemoUser(user.email)
    ? getDemoCompanyDefaults(company?.name || user.user_metadata?.company_name)
    : null;

  if (isCompanyProfileComplete(company)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mb-10 text-center">
        <TenderSistemLogo href="/" size="lg" className="mb-6" />
        <h1 className="font-heading text-3xl font-bold text-slate-900">
          Prvo pogledajte tendere koji vam imaju smisla
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-500">
          Ne tražimo od vas odmah sve podatke firme. Prvo odaberite čime se bavite i gdje se firma nalazi, pogledajte prve relevantne i najbliže tendere, a zatim dopunite profil da preporuke budu još preciznije.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-primary"
          >
            Nazad na početnu
          </Link>
        </div>
      </div>

      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-blue-500/5 sm:p-10">
        <OnboardingValueFirstForm
          companyId={company?.id ?? ""}
          companyName={company?.name ?? user.user_metadata?.company_name ?? demoDefaults?.name ?? ""}
          initialJib={company?.jib ?? demoDefaults?.jib ?? ""}
          initialPdv={company?.pdv ?? demoDefaults?.pdv ?? ""}
          initialAddress={company?.address ?? demoDefaults?.address ?? ""}
          initialContactEmail={company?.contact_email ?? demoDefaults?.contactEmail ?? user.email ?? ""}
          initialContactPhone={company?.contact_phone ?? demoDefaults?.contactPhone ?? ""}
          initialIndustry={company?.industry ?? ""}
          initialCpvCodes={company?.cpv_codes ?? []}
          initialKeywords={company?.keywords ?? []}
          initialRegions={company?.operating_regions ?? []}
        />
      </div>
    </div>
  );
}
