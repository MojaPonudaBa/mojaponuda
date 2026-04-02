import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { OpportunityDashboardCard } from "@/components/dashboard/opportunity-dashboard-card";
import { TrackedOpportunityCard } from "@/components/dashboard/tracked-opportunity-card";
import { Sparkles, Heart, Star } from "lucide-react";
import { scoreOpportunityForCompany, GRANT_MATCH_THRESHOLD } from "@/lib/opportunity-matcher";

export default async function PrilikeDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
      id: string; slug: string; type: string; title: string; issuer: string;
      deadline: string | null; value: number | null; location: string | null;
      ai_summary: string | null; ai_difficulty: string | null;
    } | null;
  };

  const follows = ((followsRaw ?? []) as unknown as FollowRow[]).filter((f) => f.opportunities !== null);
  const activeFollows = follows.filter((f) => f.outcome === null);
  const resolvedFollows = follows.filter((f) => f.outcome !== null);

  const followedIds = new Set(follows.map((f) => f.opportunity_id));
  const allOpportunities = (opportunities ?? []) as {
    id: string; slug: string; type: string; title: string; issuer: string;
    category: string | null; value: number | null; deadline: string | null;
    location: string | null; ai_summary: string | null; ai_difficulty: string | null;
  }[];
  const allPoticaji = allOpportunities.filter((o) => o.type === "poticaj" && !followedIds.has(o.id));

  // Personalised matching
  const hasProfile = (company?.keywords?.length ?? 0) > 0 || (company?.operating_regions?.length ?? 0) > 0;
  const forYou = hasProfile
    ? allPoticaji.filter((o) => scoreOpportunityForCompany(o, company!) >= GRANT_MATCH_THRESHOLD)
    : [];
  const forYouIds = new Set(forYou.map((o) => o.id));
  const poticaji = allPoticaji.filter((o) => !forYouIds.has(o.id));

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          Poticaji i grantovi
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Aktivni grantovi, subvencije i poticaji relevantni za vaše poslovanje.
        </p>
      </div>

      {/* Tracked opportunities — active */}
      {activeFollows.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="size-5 text-red-500" />
            <h2 className="font-heading text-xl font-bold text-slate-900">Praćene prilike</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {activeFollows.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Označite prilike kao dobijene ili izgubljene da pratite uspješnost prijava.
          </p>
          <div className="space-y-3">
            {activeFollows.map((f) => (
              <TrackedOpportunityCard
                key={f.id}
                follow={{
                  followId: f.id,
                  outcome: f.outcome,
                  followedAt: f.created_at,
                  opportunity: f.opportunities!,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Resolved (won/lost) */}
      {resolvedFollows.length > 0 && (
        <section>
          <h2 className="font-heading text-base font-semibold text-slate-700 mb-3">
            Arhiva prijava
          </h2>
          <div className="space-y-3">
            {resolvedFollows.map((f) => (
              <TrackedOpportunityCard
                key={f.id}
                follow={{
                  followId: f.id,
                  outcome: f.outcome,
                  followedAt: f.created_at,
                  opportunity: f.opportunities!,
                }}
              />
            ))}
          </div>
        </section>
      )}

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
            Odabrano na osnovu ključnih riječi i lokacija iz vašeg profila.
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
