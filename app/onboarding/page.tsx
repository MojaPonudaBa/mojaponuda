import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/types/database";
import { getDemoCompanyDefaults, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { OnboardingGuidedForm } from "@/components/onboarding-guided-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
        <div className="inline-flex items-baseline gap-0.5 mb-6">
          <span className="font-heading text-3xl font-bold tracking-tight text-slate-900">
            MojaPonuda
          </span>
          <span className="font-heading text-3xl font-bold text-primary">.ba</span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">
          Recite nam čime se vaša firma stvarno bavi
        </h1>
        <p className="mt-3 text-base text-slate-500 max-w-2xl mx-auto leading-7">
          Kroz nekoliko kratkih koraka unesite šta nudite, koje tendere želite pratiti i gdje realno možete izvršiti ugovor. Cilj je da profil bude jasan, potpun i bez zbunjujućih izbora, tako da preporuke tendera budu korisne već od prvog ulaska u dashboard.
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

      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl shadow-blue-500/5">
        <OnboardingGuidedForm
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
