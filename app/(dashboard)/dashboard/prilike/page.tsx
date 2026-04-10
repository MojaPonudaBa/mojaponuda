import { redirect } from "next/navigation";
import { Heart, Sparkles, Star } from "lucide-react";
import { OpportunityDashboardCard } from "@/components/dashboard/opportunity-dashboard-card";
import { TrackedOpportunityCard } from "@/components/dashboard/tracked-opportunity-card";
import { ProGate } from "@/components/subscription/pro-gate";
import { getPersonalizedOpportunityRecommendations } from "@/lib/opportunity-recommendations";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export default async function PrilikeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (!isSubscribed) return <ProGate />;

  const [{ data: followsRaw }, { data: company }] = await Promise.all([
    supabase
      .from("opportunity_follows")
      .select("id, outcome, created_at, opportunity_id, opportunities(id, slug, type, title, issuer, deadline, value, location, ai_summary, ai_difficulty)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("companies")
      .select("id, industry, keywords, cpv_codes, operating_regions")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  type FollowRow = {
    id: string;
    outcome: "won" | "lost" | null;
    created_at: string;
    opportunity_id: string;
    opportunities: {
      id: string;
      slug: string;
      type: string;
      title: string;
      issuer: string;
      deadline: string | null;
      value: number | null;
      location: string | null;
      ai_summary: string | null;
      ai_difficulty: string | null;
    } | null;
  };

  // Type guard to ensure opportunity exists and has required properties
  function isValidFollow(follow: FollowRow): follow is FollowRow & { opportunities: NonNullable<FollowRow['opportunities']> } {
    return follow.opportunities != null && typeof follow.opportunities === 'object' && !!follow.opportunities.id;
  }

  const follows = ((followsRaw ?? []) as unknown as FollowRow[]).filter(isValidFollow);
  const activeFollows = follows.filter((follow) => follow.outcome === null);
  const resolvedFollows = follows.filter((follow) => follow.outcome !== null);
  const followedIds = new Set(follows.map((follow) => follow.opportunity_id));
  
  // Ensure company data has safe defaults before passing to recommendation function
  const safeCompanyData = {
    industry: company?.industry ?? null,
    keywords: company?.keywords ?? [],
    cpv_codes: company?.cpv_codes ?? [],
    operating_regions: company?.operating_regions ?? [],
  };
  
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
    company: safeCompanyData,
    excludeOpportunityIds: followedIds,
  });

  const forYou = opportunityRecommendationResult.personalized.map(({ opportunity }) => opportunity);
  const poticaji = opportunityRecommendationResult.others;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
        <div className="relative">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Poticaji i grantovi</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Aktivni grantovi, subvencije i poticaji relevantni za vaše poslovanje, složeni u isti premium pregled kao ostatak dashboarda.
          </p>
        </div>
      </section>

      {activeFollows.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-rose-500" />
            <h2 className="font-heading text-xl font-bold text-slate-950">Praćene prilike</h2>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
              {activeFollows.length}
            </span>
          </div>
          <div className="space-y-3">
            {activeFollows.map((follow) => (
              <TrackedOpportunityCard
                key={follow.id}
                follow={{
                  followId: follow.id,
                  outcome: follow.outcome,
                  followedAt: follow.created_at,
                  opportunity: follow.opportunities!,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {resolvedFollows.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-slate-950">Arhiva prijava</h2>
          <div className="space-y-3">
            {resolvedFollows.map((follow) => (
              <TrackedOpportunityCard
                key={follow.id}
                follow={{
                  followId: follow.id,
                  outcome: follow.outcome,
                  followedAt: follow.created_at,
                  opportunity: follow.opportunities!,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {forYou.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="size-5 fill-amber-400 text-amber-500" />
            <h2 className="font-heading text-xl font-bold text-slate-950">Poticaji za Vas</h2>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {forYou.length}
            </span>
          </div>
          <div className="space-y-3">
            {forYou.map((opportunity) => (
              <OpportunityDashboardCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-sky-600" />
          <h2 className="font-heading text-xl font-bold text-slate-950">
            {forYou.length > 0 ? "Ostali poticaji" : "Svi poticaji"}
          </h2>
        </div>
        {poticaji.length > 0 ? (
          <div className="space-y-3">
            {poticaji.map((opportunity) => (
              <OpportunityDashboardCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 py-12 text-center text-sm text-slate-500 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.22)]">
            Poticaji se ažuriraju svakodnevno. Provjerite ponovo uskoro.
          </div>
        )}
      </section>
    </div>
  );
}
