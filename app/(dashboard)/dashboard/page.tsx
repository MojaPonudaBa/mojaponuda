import { redirect } from "next/navigation";
import { DashboardHomeOverview } from "@/components/dashboard/home-overview";
import { UserStatsCard } from "@/components/dashboard/user-stats-card";
import { getUserBidStats } from "@/lib/user-bid-analytics";
import { getProfileOptionLabel } from "@/lib/company-profile";
import {
  demoBidSummaries,
  getDemoDocuments,
  isCompanyProfileComplete,
  isDemoUser,
} from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { getPersonalizedTenderRecommendations } from "@/lib/personalized-tenders";
import { getRecommendedTenders } from "@/lib/tender-relevance";
import {
  buildRecommendationContext,
  RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
  RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
} from "@/lib/tender-recommendations";
import { getPreparationUsageSummary } from "@/lib/preparation-credits";
import type { BidStatus, Document as DocType } from "@/types/database";

function formatCompactCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${Math.round(value)} KM`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDaysLabel(days: number): string {
  if (days <= 0) return "danas";
  if (days === 1) return "1 dan";
  return `${days} dana`;
}

function formatDeadlineMeta(days: number | null): string {
  if (days === null) return "Rok uskoro";
  if (days <= 0) return "Rok je danas";
  if (days === 1) return "1 dan do roka";
  return `${days} dana do roka`;
}

function buildPreparationStatus(summary: Awaited<ReturnType<typeof getPreparationUsageSummary>>) {
  if (summary.planId === "basic") {
    return {
      label: "Pripreme",
      value: "Zaključano",
      description: "Za pokretanje pripreme ponude aktivirajte Osnovni paket ili viši.",
      href: "/dashboard/subscription",
      cta: "Pogledaj pakete",
    };
  }

  if (summary.planId === "starter") {
    return {
      label: "Pripreme",
      value: `${summary.totalRemaining} dostupno`,
      description:
        summary.totalRemaining > 0
          ? `${summary.purchasedRemaining} kupljenih priprema trenutno je spremno. Dodatne pripreme kupujete po ${summary.payAsYouGoPrice ?? 0} KM ili kroz paket.`
          : `Trenutno nemate dostupnu pripremu. Kupite novu za ${summary.payAsYouGoPrice ?? 0} KM ili uzmite paket priprema.`,
      href: "/dashboard/subscription#pripreme",
      cta: summary.totalRemaining > 0 ? "Upravljaj pripremama" : "Dopuni pripreme",
    };
  }

  return {
    label: "Pripreme",
    value: `${summary.totalRemaining} dostupno`,
    description: `${summary.includedRemaining} od ${summary.includedLimit} uključenih priprema još je dostupno, uz ${summary.purchasedRemaining} kupljenih u rezervi.`,
    href: "/dashboard/subscription#pripreme",
    cta: summary.totalRemaining > 0 ? "Pregledaj potrošnju" : "Dodaj paket priprema",
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const subscriptionStatus = await getSubscriptionStatus(user.id, user.email, supabase);
  if (isAgencyPlan(subscriptionStatus.plan)) redirect("/dashboard/agency");

  const isDemoAccount = isDemoUser(user.email);
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, jib, industry, keywords, cpv_codes, operating_regions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as {
    id: string;
    name: string;
    jib: string;
    industry: string | null;
    keywords: string[] | null;
    cpv_codes: string[] | null;
    operating_regions: string[] | null;
  };

  const recommendationContext = buildRecommendationContext(resolvedCompany);
  const now = new Date();
  const nowIso = now.toISOString();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeBidsCount },
    { count: wonBidsCount },
    { count: lostBidsCount },
    { data: expiringDocs },
    { count: documentsCountValue },
    { data: allBidRowsData },
  ] = await Promise.all([
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("company_id", resolvedCompany.id)
      .in("status", ["draft", "in_review", "submitted"]),
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("company_id", resolvedCompany.id)
      .eq("status", "won"),
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("company_id", resolvedCompany.id)
      .eq("status", "lost"),
    supabase
      .from("documents")
      .select("id, name, type, expires_at")
      .eq("company_id", resolvedCompany.id)
      .not("expires_at", "is", null)
      .lte("expires_at", sixtyDaysFromNow)
      .gte("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", resolvedCompany.id),
    supabase
      .from("bids")
      .select("id, tender_id, status, created_at, tenders(title, deadline, estimated_value, contracting_authority)")
      .eq("company_id", resolvedCompany.id)
      .order("created_at", { ascending: false }),
  ]);

  const demoDocuments = isDemoAccount ? getDemoDocuments(resolvedCompany.id) : [];
  const expiring = ((expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[]).length > 0
    ? ((expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[])
    : demoDocuments;

  const allBidRows = (allBidRowsData ?? []) as Array<{
    id: string;
    tender_id: string;
    status: BidStatus;
    created_at: string;
    tenders: {
      title: string;
      deadline: string | null;
      estimated_value: number | null;
      contracting_authority: string | null;
    } | null;
  }>;

  const existingBidTenderIds = new Set(
    allBidRows
      .map((bid) => bid.tender_id)
      .filter((value): value is string => Boolean(value)),
  );

  const portfolioBids = allBidRows.length > 0
    ? allBidRows.map((bid) => ({
        id: bid.id,
        status: bid.status,
        created_at: bid.created_at,
        tenders: bid.tenders ?? {
          title: "Nepoznat tender",
          deadline: null,
          estimated_value: null,
          contracting_authority: null,
        },
      }))
    : isDemoAccount
      ? demoBidSummaries.map((bid) => ({
          id: bid.id,
          status: bid.status,
          created_at: bid.created_at,
          tenders: {
            title: bid.tender.title,
            deadline: bid.tender.deadline,
            estimated_value: bid.tender.estimated_value,
            contracting_authority: bid.tender.contracting_authority,
          },
        }))
      : [];

  const activePortfolioBids = portfolioBids.filter((bid) =>
    ["draft", "in_review", "submitted"].includes(bid.status),
  );
  const urgentBidDeadlines = activePortfolioBids
    .filter((bid) => bid.tenders.deadline)
    .sort((first, second) => new Date(first.tenders.deadline!).getTime() - new Date(second.tenders.deadline!).getTime())
    .slice(0, 4);
  const submittedCount = activePortfolioBids.filter((bid) => bid.status === "submitted").length;
  const inReviewCount = activePortfolioBids.filter((bid) => bid.status === "in_review").length;
  const displayWonBids = (wonBidsCount ?? 0) > 0
    ? (wonBidsCount ?? 0)
    : portfolioBids.filter((bid) => bid.status === "won").length;
  const displayLostBids = (lostBidsCount ?? 0) > 0
    ? (lostBidsCount ?? 0)
    : portfolioBids.filter((bid) => bid.status === "lost").length;
  const closedBidsCount = displayWonBids + displayLostBids;
  const winRate = closedBidsCount > 0 ? Math.round((displayWonBids / closedBidsCount) * 100) : null;

  let missingChecklistCount = 0;
  const activeBidIds = activePortfolioBids.map((bid) => bid.id);
  if (activeBidIds.length > 0) {
    const { data: checklistOverview } = await supabase
      .from("bid_checklist_items")
      .select("status")
      .in("bid_id", activeBidIds);

    missingChecklistCount = checklistOverview?.filter((item) => item.status === "missing").length ?? 0;
  }

  // Primary: LLM-scored recommendations (same pipeline as /dashboard/tenders?tab=recommended).
  // This ensures the KPI card "Relevantne prilike" and the Preporučeno tab always show
  // the SAME count. topK=200 + minScore=6 must match the tenders page.
  type DashboardTenderRow = {
    id: string;
    title: string;
    deadline: string | null;
    estimated_value: number | null;
    contracting_authority: string | null;
    contracting_authority_jib: string | null;
    contract_type: string | null;
    raw_description: string | null;
  };

  let relevantTenders: DashboardTenderRow[] = [];
  let relevantTenderCount = 0;

  const llmScored = await getRecommendedTenders<DashboardTenderRow>(
    supabase,
    resolvedCompany.id,
    { topK: 200, limit: 1000, minScore: 6, nowIso }
  );

  if (llmScored.length > 0) {
    const gated = llmScored.filter(({ tender }) => !existingBidTenderIds.has(tender.id));
    relevantTenders = gated.map(({ tender }) => tender);
    relevantTenderCount = relevantTenders.length;
  } else {
    // Fallback: company without profile_embedding (pre-backfill) — use legacy
    // keyword/CPV pipeline so the card still shows something useful.
    const legacy = await getPersonalizedTenderRecommendations<DashboardTenderRow>(supabase, {
      company: resolvedCompany,
      companyId: resolvedCompany.id,
      select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description",
      nowIso,
      candidateLimit: RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
      minimumResults: RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
      excludeTenderIds: existingBidTenderIds,
      limit: 4,
      rerank: false,
    });
    relevantTenders = legacy.recommendations.map(({ tender }) => tender);
    relevantTenderCount = legacy.totalCount;
  }
  const relevantTenderValue = relevantTenders.reduce((sum, tender) => sum + (Number(tender.estimated_value) || 0), 0);
  const documentsCount = documentsCountValue ?? demoDocuments.length;
  const dashboardBidRows = portfolioBids.slice(0, 6);
  const nextDeadlineInDays = urgentBidDeadlines[0]?.tenders.deadline
    ? daysUntil(urgentBidDeadlines[0].tenders.deadline)
    : null;
  const currentPlanName = subscriptionStatus.isSubscribed ? subscriptionStatus.plan.name : "Bez aktivne pretplate";
  const profileLabel = recommendationContext.profile.primaryIndustry
    ? getProfileOptionLabel(recommendationContext.profile.primaryIndustry)
    : null;
  const warningCount = expiring.length + missingChecklistCount;

  const nextAction = urgentBidDeadlines[0]
    ? {
        title: "Prvo riješite najbliži rok",
        description: `Ponuda "${urgentBidDeadlines[0].tenders.title}" je najbliže roku i treba je otvoriti prije ostalih zadataka.`,
        href: `/dashboard/bids/${urgentBidDeadlines[0].id}`,
        cta: "Otvori ponudu",
        meta: formatDeadlineMeta(nextDeadlineInDays),
        tone: "critical" as const,
      }
    : missingChecklistCount > 0
      ? {
          title: "Dovršite otvorene stavke",
          description: `Imate ${missingChecklistCount} stavki koje još mogu usporiti ili zaustaviti predaju ponude.`,
          href: "/dashboard/bids",
          cta: "Otvori ponude",
          meta: `${missingChecklistCount} otvorenih stavki`,
          tone: "attention" as const,
        }
      : expiring.length > 0
        ? {
            title: "Provjerite dokumente",
            description: `${expiring.length} dokumenata uskoro ističe i vrijedi ih zatvoriti prije sljedeće prijave.`,
            href: "/dashboard/vault",
            cta: "Otvori dokumente",
            meta: `${expiring.length} dokumenata pred istekom`,
            tone: "attention" as const,
          }
        : relevantTenders[0]
          ? {
              title: "Pogledajte novu priliku",
              description: `Tender "${relevantTenders[0].title}" izgleda kao realna prilika na osnovu vašeg profila firme.`,
              href: `/dashboard/tenders/${relevantTenders[0].id}`,
              cta: "Otvori tender",
              meta: `${relevantTenderCount} relevantnih tendera`,
              tone: "opportunity" as const,
            }
            : {
                title: "Otvorite preporuke",
                description: "Pregledajte preporučene tendere i provjerite da li se pojavilo nešto što vrijedi otvoriti danas.",
                href: "/dashboard/tenders?tab=recommended",
                cta: "Idi na preporuke",
                meta: "Nema hitnih blokera",
              tone: "neutral" as const,
            };

  const focusCards = [
    {
      title: "Aktivne ponude",
      value: String((activeBidsCount ?? 0) > 0 ? (activeBidsCount ?? 0) : activePortfolioBids.length),
      meta: `${submittedCount} predane · ${inReviewCount} u provjeri`,
      href: "/dashboard/bids",
      icon: "briefcase" as const,
    },
    {
      title: "Relevantne prilike",
      value: String(relevantTenderCount),
      meta: relevantTenderCount > 0
        ? relevantTenderValue > 0
          ? `Poznata vrijednost ${formatCompactCurrency(relevantTenderValue)}`
          : "Najbolje otvorene prilike iz vašeg profila"
        : "Dopunite profil za jasnije preporuke",
      href: "/dashboard/tenders?tab=recommended",
      icon: "search" as const,
    },
    {
      title: "Nepriloženi dokumenti",
      value: String(warningCount),
      meta: `${expiring.length} dokumenta · ${missingChecklistCount} otvorenih stavki`,
      href: warningCount > 0 ? "/dashboard/bids" : "/dashboard/vault",
      icon: "bell" as const,
    },
    {
      title: "Ishod ponuda",
      value: winRate !== null ? `${winRate}%` : String(displayWonBids),
      meta: winRate !== null
        ? `${displayWonBids} dobijeno · ${displayLostBids} izgubljeno`
        : `${displayWonBids} dobijene ponude`,
      href: "/dashboard/bids",
      icon: "trend" as const,
    },
  ];

  const actionQueue = [
    ...urgentBidDeadlines.slice(0, 3).map((bid) => ({
      id: `deadline-${bid.id}`,
      title: bid.tenders.title,
      description: `Ponuda je aktivna i rok za predaju je ${bid.tenders.deadline ? formatDaysLabel(daysUntil(bid.tenders.deadline)) : "uskoro"}.`,
      href: `/dashboard/bids/${bid.id}`,
      badge: bid.tenders.deadline ? formatDaysLabel(daysUntil(bid.tenders.deadline)) : "Rok",
      tone: "critical" as const,
    })),
    ...(missingChecklistCount > 0
      ? [{
          id: "checklist-warning",
          title: "Zatvorite otvorene stavke",
          description: "Otvorite ponude i uklonite stvari koje još mogu zaustaviti predaju.",
          href: "/dashboard/bids",
          badge: `${missingChecklistCount} stavki`,
          tone: "attention" as const,
        }]
      : []),
    ...(expiring.length > 0
      ? [{
          id: "documents-warning",
          title: "Provjerite dokumente pred istekom",
          description: `${expiring.length} dokumenata uskoro treba obnovu ako ne želite kašnjenje na narednoj prijavi.`,
          href: "/dashboard/vault",
          badge: `${expiring.length} dokumenta`,
          tone: "attention" as const,
        }]
      : []),
    ...(relevantTenders[0]
      ? [{
          id: `relevant-${relevantTenders[0].id}`,
          title: "Pogledajte sljedeći tender",
          description: `Vrijedi provjeriti: ${relevantTenders[0].title}`,
          href: `/dashboard/tenders/${relevantTenders[0].id}`,
          badge: "Nova prilika",
          tone: "opportunity" as const,
        }]
      : []),
  ].slice(0, 5);

  const quickLinks = [
    {
      label: "Otvori tendere",
      href: "/dashboard/tenders",
      description: relevantTenderCount > 0
        ? `${relevantTenderCount} preporuka već čeka pregled`
        : "Pregledajte sve aktivne i preporučene tendere",
    },
    {
      label: "Moje ponude",
      href: "/dashboard/bids",
      description: activePortfolioBids.length > 0
        ? `${activePortfolioBids.length} aktivnih ponuda u radu`
        : "Pokrenite radni prostor za tender koji vrijedi pripremati",
    },
    {
      label: "Dokumenti",
      href: "/dashboard/vault",
      description: documentsCount > 0
        ? `${documentsCount} dokumenata u spremištu`
        : "Dodajte osnovne dokumente za bržu pripremu prijava",
    },
  ];

  const preparationSummary = await getPreparationUsageSummary(supabase, {
    userId: user.id,
    companyId: resolvedCompany.id,
    plan: subscriptionStatus.plan,
    subscription: subscriptionStatus.subscription,
  });

  // Win rate / win trend / top naručioci — prikazujemo samo ako firma već
  // ima predanih ponuda (card se sama skriva kad je 0 predanih).
  const bidStats = await getUserBidStats(resolvedCompany.id);

  return (
    <>
      <DashboardHomeOverview
        companyName={resolvedCompany.name}
        currentPlanName={currentPlanName}
        profileLabel={profileLabel}
        nextAction={nextAction}
        focusCards={focusCards}
        actionQueue={actionQueue}
        dashboardBidRows={dashboardBidRows}
        recommendedTenders={relevantTenders.slice(0, 4).map((tender) => ({
          id: tender.id,
          title: tender.title,
          deadline: tender.deadline,
          estimated_value: tender.estimated_value,
          contracting_authority: tender.contracting_authority,
        }))}
        quickLinks={quickLinks}
        preparationStatus={buildPreparationStatus(preparationSummary)}
        subscriptionActive={subscriptionStatus.isSubscribed}
        isLocked={subscriptionStatus.plan?.id === "basic"}
        bidHrefBase="/dashboard/bids"
      />

      <div className="mx-auto mt-6 w-full max-w-[1400px] px-4 sm:px-6">
        <UserStatsCard stats={bidStats} />
      </div>
    </>
  );
}
