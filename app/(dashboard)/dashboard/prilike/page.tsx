import { redirect } from "next/navigation";
import { Heart, Sparkles, Star } from "lucide-react";
import { OpportunityDashboardCard } from "@/components/dashboard/opportunity-dashboard-card";
import { TrackedOpportunityCard } from "@/components/dashboard/tracked-opportunity-card";
import { ProGate } from "@/components/subscription/pro-gate";
import { scoreOpportunityForCompany, GRANT_MATCH_THRESHOLD } from "@/lib/opportunity-matcher";
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

  const [{ data: opportunities }, { data: followsRaw }, { data: company }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, slug, type, title, issuer, category, value, deadline, location, ai_summary, ai_difficulty")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("opportunity_follows")
      .select("id, outcome, created_at, opportunity_id, opportunities(id, slug, type, title, issuer, deadline, value, location, ai_summary, ai_difficulty)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("companies")
      .select("id, keywords, operating_regions")
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

  const follows = ((followsRaw ?? []) as unknown as FollowRow[]).filter((follow) => follow.opportunities !== null);
  const activeFollows = follows.filter((follow) => follow.outcome === null);
  const resolvedFollows = follows.filter((follow) => follow.outcome !== null);
  const followedIds = new Set(follows.map((follow) => follow.opportunity_id));

  const allOpportunities = (opportunities ?? []) as Array<{
    id: string;
    slug: string;
    type: string;
    title: string;
    issuer: string;
    category: string | null;
    value: number | null;
    deadline: string | null;
    location: string | null;
    ai_summary: string | null;
    ai_difficulty: string | null;
  }>;

  const allPoticaji = allOpportunities.filter((opportunity) => opportunity.type === "poticaj" && !followedIds.has(opportunity.id));
  const hasProfile = (company?.keywords?.length ?? 0) > 0 || (company?.operating_regions?.length ?? 0) > 0;
  const forYou = hasProfile
    ? allPoticaji.filter((opportunity) => scoreOpportunityForCompany(opportunity, company!) >= GRANT_MATCH_THRESHOLD)
    : [];
  const forYouIds = new Set(forYou.map((opportunity) => opportunity.id));
  const poticaji = allPoticaji.filter((opportunity) => !forYouIds.has(opportunity.id));

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
            <Heart className="size-5 text-rose-300" />
            <h2 className="font-heading text-xl font-bold text-white">Praćene prilike</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
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
          <h2 className="font-heading text-xl font-bold text-white">Arhiva prijava</h2>
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
            <Star className="size-5 fill-amber-300 text-amber-300" />
            <h2 className="font-heading text-xl font-bold text-white">Poticaji za vas</h2>
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
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
          <Sparkles className="size-5 text-sky-300" />
          <h2 className="font-heading text-xl font-bold text-white">
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
          <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 py-12 text-center text-sm text-slate-400">
            Poticaji se ažuriraju svakodnevno. Provjerite ponovo uskoro.
          </div>
        )}
      </section>
    </div>
  );
}
