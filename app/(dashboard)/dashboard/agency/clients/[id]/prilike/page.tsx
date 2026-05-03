import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { OpportunityDashboardCard } from "@/components/dashboard/opportunity-dashboard-card";
import { Sparkles, Star } from "lucide-react";
import { getPersonalizedOpportunityRecommendations } from "@/lib/opportunity-recommendations";

export default async function AgencyClientPrilikePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agencyClientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (!isAgencyPlan(plan)) redirect("/dashboard");

  // Verify agency client belongs to this user
  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies(name, industry, keywords, cpv_codes, operating_regions)")
    .eq("id", agencyClientId)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  type AgencyCompany = {
    name: string;
    industry: string | null;
    keywords: string[] | null;
    cpv_codes: string[] | null;
    operating_regions: string[] | null;
  } | null;
  const clientCompany = agencyClient.companies as AgencyCompany;
  const companyName = clientCompany?.name ?? "Klijent";
  const opportunityRecommendationResult = await getPersonalizedOpportunityRecommendations<{
    id: string;
    slug: string;
    type: "tender" | "poticaj";
    title: string;
    issuer: string;
    category: string | null;
    subcategory: string | null;
    industry: string | null;
    value: number | null;
    deadline: string | null;
    location: string | null;
    requirements: string | null;
    eligibility_signals: string[] | null;
    description: string | null;
    status: "active" | "expired" | "draft";
    ai_summary: string | null;
    ai_who_should_apply: string | null;
    ai_difficulty: "lako" | "srednje" | "tesko" | null;
    created_at: string;
  }>(supabase, {
    company: {
      industry: clientCompany?.industry ?? null,
      keywords: clientCompany?.keywords ?? [],
      cpv_codes: clientCompany?.cpv_codes ?? [],
      operating_regions: clientCompany?.operating_regions ?? [],
    },
  });

  const forYou = opportunityRecommendationResult.personalized.map(({ opportunity }) => opportunity);
  const poticaji = opportunityRecommendationResult.others;

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          Poticaji i grantovi
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Aktivni grantovi, subvencije i poticaji za {companyName}.
        </p>
      </div>

      {/* Personalised — Poticaji za Vas */}
      {forYou.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Star className="size-5 text-amber-500 fill-amber-400" />
            <h2 className="font-heading text-xl font-bold text-slate-900">Poticaji za Vas</h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {forYou.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Odabrano na osnovu ključnih riječi i lokacija iz profila kompanije {companyName}.
          </p>
          <div className="space-y-3">
            {forYou.map((o) => (
              <OpportunityDashboardCard key={o.id} opportunity={o} />
            ))}
          </div>
        </section>
      )}

      {/* All other poticaji */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="size-5 text-blue-600" />
          <h2 className="font-heading text-xl font-bold text-slate-900">
            {forYou.length > 0 ? "Ostali poticaji" : "Svi poticaji"}
          </h2>
        </div>
        {poticaji.length > 0 ? (
          <div className="space-y-3">
            {poticaji.map((o) => (
              <OpportunityDashboardCard key={o.id} opportunity={o} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <p className="text-sm text-slate-500">Poticaji se ažuriraju svakodnevno. Provjerite ponovo uskoro.</p>
          </div>
        )}
      </section>
    </div>
  );
}
