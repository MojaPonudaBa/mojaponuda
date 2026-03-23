import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  demoBidSummaries,
  demoCompetitors,
  getDemoDocuments,
  isCompanyProfileComplete,
  isDemoUser,
  demoUpcomingProcurements,
} from "@/lib/demo";
import type { BidStatus, Document as DocType } from "@/types/database";
import { getProfileOptionLabel } from "@/lib/company-profile";
import { DashboardHomeOverview } from "@/components/dashboard/home-overview";
import { getCompetitorAnalysis } from "@/lib/market-intelligence";
import { maybeRerankTenderRecommendationsWithAI } from "@/lib/tender-recommendation-rerank";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  selectTenderRecommendations,
} from "@/lib/tender-recommendations";
import { getSubscriptionStatus } from "@/lib/subscription";

function formatCompactCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${Math.round(value)} KM`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  // Calculate dates outside of query builder to avoid impure function warnings
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [
    , // documentsCount (unused in this parallel block — fetched below)
    { count: bidsCount },
    { count: wonBidsCount },
    { count: lostBidsCount },
    { data: expiringDocs },
    { data: recentBids },
    subscriptionStatus,
    { count: documentsCountValue },
    { data: allBidRowsData },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).in("status", ["draft", "in_review", "submitted"]),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).eq("status", "won"),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).eq("status", "lost"),
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
      .from("bids")
      .select("id, status, created_at, tenders(title, deadline, estimated_value)")
      .eq("company_id", resolvedCompany.id)
      .order("created_at", { ascending: false })
      .limit(6),
    // OPT 2: Reuse existing supabase client — avoids an extra connection
    getSubscriptionStatus(user.id, user.email, supabase),
    // OPT 1: Run documentsCount and allBidRows in parallel with the above
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
  const realBids = (recentBids ?? []) as {
    id: string;
    status: BidStatus;
    created_at: string;
    tenders: { title: string; deadline: string | null; estimated_value: number | null };
  }[];
  const bids = realBids.length > 0
    ? realBids
    : isDemoAccount
      ? demoBidSummaries.map((bid) => ({
        id: bid.id,
        status: bid.status,
        created_at: bid.created_at,
        tenders: {
          title: bid.tender.title,
          deadline: bid.tender.deadline,
          estimated_value: bid.tender.estimated_value,
        },
      }))
      : [];

  const totalActiveBids = (bidsCount ?? 0) + (wonBidsCount ?? 0) + (lostBidsCount ?? 0);
  const displayTotalBids = totalActiveBids > 0 ? totalActiveBids : bids.length;
  const displayDraftBids = (bidsCount ?? 0) > 0 ? (bidsCount ?? 0) : bids.filter((bid) => ["draft", "in_review", "submitted"].includes(bid.status)).length;
  const displayWonBids = (wonBidsCount ?? 0) > 0 ? (wonBidsCount ?? 0) : bids.filter((bid) => bid.status === "won").length;
  const displayLostBids = (lostBidsCount ?? 0) > 0 ? (lostBidsCount ?? 0) : bids.filter((bid) => bid.status === "lost").length;

  const allBidRows = ((allBidRowsData ?? []) as {
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
  }[]);
  const existingBidTenderIds = new Set(
    allBidRows
      .map((bid) => bid.tender_id)
      .filter((value): value is string => Boolean(value))
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
    ["draft", "in_review", "submitted"].includes(bid.status)
  );
  const urgentBidDeadlines = activePortfolioBids
    .filter((bid) => bid.tenders.deadline)
    .sort(
      (a, b) =>
        new Date(a.tenders.deadline!).getTime() -
        new Date(b.tenders.deadline!).getTime()
    )
    .slice(0, 4);
  const submittedCount = activePortfolioBids.filter((bid) => bid.status === "submitted").length;
  const inReviewCount = activePortfolioBids.filter((bid) => bid.status === "in_review").length;
  const closedBidsCount = displayWonBids + displayLostBids;
  const winRate = closedBidsCount > 0 ? Math.round((displayWonBids / closedBidsCount) * 100) : null;
  const wonEstimatedValue = portfolioBids
    .filter((bid) => bid.status === "won")
    .reduce((sum, bid) => sum + (Number(bid.tenders.estimated_value) || 0), 0);

  let missingChecklistCount = 0;
  let totalChecklistCount = 0;
  const activeBidIds = activePortfolioBids.map((bid) => bid.id);
  if (activeBidIds.length > 0) {
    const { data: checklistOverview } = await supabase
      .from("bid_checklist_items")
      .select("status")
      .in("bid_id", activeBidIds);

    totalChecklistCount = checklistOverview?.length ?? 0;
    missingChecklistCount =
      checklistOverview?.filter((item) => item.status === "missing").length ?? 0;
  }

  let relevantTenders: {
    id: string;
    title: string;
    deadline: string | null;
    estimated_value: number | null;
    contracting_authority: string | null;
    contracting_authority_jib: string | null;
    contract_type: string | null;
    raw_description: string | null;
    cpv_code?: string | null;
  }[] = [];

  if (hasRecommendationSignals(recommendationContext)) {
    const relevantRows = await fetchRecommendedTenderCandidates<{
      id: string;
      title: string;
      deadline: string | null;
      estimated_value: number | null;
      contracting_authority: string | null;
      contracting_authority_jib: string | null;
      contract_type: string | null;
      raw_description: string | null;
      authority_city: string | null;
      authority_municipality: string | null;
      authority_canton: string | null;
      authority_entity: string | null;
    }>(supabase, recommendationContext, {
      select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description",
      nowIso,
      limit: 60,
    });

    const availableRelevantRows = relevantRows.filter(
      (tender) => !existingBidTenderIds.has(tender.id)
    );
    const rankedRelevantTenders = selectTenderRecommendations(
      availableRelevantRows,
      recommendationContext,
      {
        minimumResults: 4,
      }
    );

    relevantTenders = (
      await maybeRerankTenderRecommendationsWithAI(
        rankedRelevantTenders,
        recommendationContext,
        {
          limit: 12,
          shortlistSize: 8,
        }
      )
    ).map(({ tender }) => tender);
  }

  const relevantTenderCount = relevantTenders.length;
  const relevantTenderValue = relevantTenders.reduce(
    (sum, tender) => sum + (Number(tender.estimated_value) || 0),
    0
  );

  const topAuthoritiesMap = new Map<
    string,
    { name: string; count: number; totalValue: number }
  >();
  for (const tender of relevantTenders) {
    const key = tender.contracting_authority || "Nepoznat naručilac";
    const entry = topAuthoritiesMap.get(key);
    const amount = Number(tender.estimated_value) || 0;
    if (entry) {
      entry.count += 1;
      entry.totalValue += amount;
    } else {
      topAuthoritiesMap.set(key, { name: key, count: 1, totalValue: amount });
    }
  }
  const topRelevantAuthorities = [...topAuthoritiesMap.values()]
    .sort((a, b) => b.count - a.count || b.totalValue - a.totalValue)
    .slice(0, 3);
  const topRelevantAuthoritiesSource = topRelevantAuthorities.length > 0 ? "live" : "empty";

  const today = new Date().toISOString().split("T")[0];

  // OPT 1: upcomingRows and competitorAnalysis are independent — run in parallel
  const [{ data: upcomingRowsData }, resolvedCompetitorAnalysis] = await Promise.all([
    supabase
      .from("planned_procurements")
      .select(
        "id, description, planned_date, estimated_value, contract_type, contracting_authorities(name, jib)"
      )
      .gte("planned_date", today)
      .order("planned_date", { ascending: true })
      .limit(3),
    subscriptionStatus.isSubscribed
      ? getCompetitorAnalysis(supabase, {
          jib: resolvedCompany.jib,
          industry: resolvedCompany.industry,
          keywords: resolvedCompany.keywords || [],
          operating_regions: resolvedCompany.operating_regions || [],
        })
      : Promise.resolve(null),
  ]);

  const upcomingRows = ((upcomingRowsData ?? []) as {
    id: string;
    description: string | null;
    planned_date: string | null;
    estimated_value: number | null;
    contract_type: string | null;
    contracting_authorities: { name: string; jib: string } | null;
  }[]);

  const displayUpcomingRows = upcomingRows.length > 0
    ? upcomingRows
    : isDemoAccount
      ? demoUpcomingProcurements.slice(0, 3)
      : [];

  let competitorSnapshot: {
    name: string;
    jib: string;
    wins: number;
    total_value: number;
    win_rate: number | null;
  }[] = [];
  let competitorSnapshotSource: "live" | "demo" | "empty" = "empty";

  if (resolvedCompetitorAnalysis) {
    competitorSnapshot = resolvedCompetitorAnalysis.competitors
      .slice(0, 3)
      .map((competitor) => ({
        name: competitor.name,
        jib: competitor.jib,
        wins: competitor.wins,
        total_value: competitor.total_value,
        win_rate: competitor.win_rate,
      }));

    if (competitorSnapshot.length > 0) {
      competitorSnapshotSource = "live";
    }
  }

  if (competitorSnapshot.length === 0 && isDemoAccount) {
    competitorSnapshot = demoCompetitors.slice(0, 3).map((competitor) => ({
      name: competitor.name,
      jib: competitor.jib,
      wins: competitor.wins,
      total_value: competitor.total_value,
      win_rate: competitor.win_rate,
    }));
    competitorSnapshotSource = "demo";
  }

  const documentsCount = documentsCountValue ?? demoDocuments.length;
  const dashboardBidRows = portfolioBids.slice(0, 6);
  const nextDeadlineInDays = urgentBidDeadlines[0]?.tenders.deadline
    ? daysUntil(urgentBidDeadlines[0].tenders.deadline)
    : null;
  const currentPlanName = subscriptionStatus.isSubscribed
    ? subscriptionStatus.plan.name
    : "Bez aktivne pretplate";
  const profileLabel = recommendationContext.profile.primaryIndustry
    ? getProfileOptionLabel(recommendationContext.profile.primaryIndustry)
    : null;
  const warningCount = expiring.length + missingChecklistCount;
  const nextAction = urgentBidDeadlines[0]
    ? {
        title: "Prvo riješite najbliži rok",
        description: `Ponuda \"${urgentBidDeadlines[0].tenders.title}\" je najbliže roku i nosi najveći operativni rizik ako je ne otvorite sada.`,
        href: `/dashboard/bids/${urgentBidDeadlines[0].id}`,
        cta: "Otvori ponudu",
        meta: formatDeadlineMeta(nextDeadlineInDays),
        tone: "critical" as const,
      }
    : missingChecklistCount > 0
      ? {
          title: "Dovršite otvorene stavke",
          description: `Imate ${missingChecklistCount} stavki koje još mogu usporiti ili ugroziti predaju ponude.`,
          href: "/dashboard/bids",
          cta: "Otvori ponude",
          meta: `${missingChecklistCount} otvorenih stavki`,
          tone: "attention" as const,
        }
      : expiring.length > 0
        ? {
            title: "Provjerite dokumente",
            description: `${expiring.length} dokumenata uskoro ističe i mogu vas blokirati kada dođe pravi tender.`,
            href: "/dashboard/vault",
            cta: "Otvori dokumente",
            meta: `${expiring.length} dokumenata pred istekom`,
            tone: "attention" as const,
          }
        : relevantTenders[0]
          ? {
              title: "Pogledajte novi tender",
              description: `Tender \"${relevantTenders[0].title}\" izgleda kao realna prilika na osnovu vaše djelatnosti i lokacije firme.`,
              href: `/dashboard/tenders/${relevantTenders[0].id}`,
              cta: "Otvori tender",
              meta: `${relevantTenderCount} relevantnih tendera`,
              tone: "opportunity" as const,
            }
          : {
              title: "Otvorite pregled prilika",
              description: "Pogledajte nove tendere i provjerite da li se pojavilo nešto što vrijedi otvoriti.",
              href: "/dashboard/tenders?tab=recommended",
              cta: "Idi na preporuke",
              meta: "Nema hitnih blokera",
              tone: "neutral" as const,
            };

  const focusCards = [
    {
      title: "Aktivne ponude",
      value: String(activePortfolioBids.length),
      meta: `${submittedCount} predane · ${inReviewCount} u provjeri`,
      href: "/dashboard/bids",
      icon: "briefcase" as const,
    },
    {
      title: "Relevantne prilike",
      value: String(relevantTenderCount),
      meta:
        relevantTenderCount > 0
          ? relevantTenderValue > 0
            ? `Poznata vrijednost ${formatCompactCurrency(relevantTenderValue)}`
            : "Najbolje otvorene prilike iz vašeg profila"
          : "Dopunite profil za jasnije prijedloge",
      href: "/dashboard/tenders?tab=recommended",
      icon: "search" as const,
    },
    {
      title: "Rizici za provjeru",
      value: String(warningCount),
      meta: `${expiring.length} dokumenta · ${missingChecklistCount} otvorenih stavki`,
      href: warningCount > 0 ? "/dashboard/bids" : "/dashboard/vault",
      icon: "bell" as const,
    },
    {
      title: "Ishod ponuda",
      value: winRate !== null ? `${winRate}%` : String(displayWonBids),
      meta: winRate !== null ? `${displayWonBids} dobijeno · ${displayLostBids} izgubljeno` : `${displayWonBids} dobijene ponude`,
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
      ? [
          {
            id: "checklist-warning",
            title: "Zatvorite otvorene stavke",
            description: "Otvorite ponude i uklonite stvari koje još mogu zaustaviti predaju.",
            href: "/dashboard/bids",
            badge: `${missingChecklistCount} stavki`,
            tone: "attention" as const,
          },
        ]
      : []),
    ...(expiring.length > 0
      ? [
          {
            id: "documents-warning",
            title: "Provjerite dokumente pred istekom",
            description: `${expiring.length} dokumenata uskoro treba obnovu ako ne želite kašnjenje na narednoj prijavi.`,
            href: "/dashboard/vault",
            badge: `${expiring.length} dokumenta`,
            tone: "attention" as const,
          },
        ]
      : []),
    ...(relevantTenders[0]
      ? [
          {
            id: `relevant-${relevantTenders[0].id}`,
            title: "Pogledajte sljedeći tender",
            description: `Vrijedi provjeriti: ${relevantTenders[0].title}`,
            href: `/dashboard/tenders/${relevantTenders[0].id}`,
            badge: "Nova prilika",
            tone: "opportunity" as const,
          },
        ]
      : []),
  ].slice(0, 5);

  return (
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
      topRelevantAuthorities={topRelevantAuthorities}
      topRelevantAuthoritiesSource={topRelevantAuthoritiesSource}
      competitorSnapshot={competitorSnapshot}
      competitorSnapshotSource={competitorSnapshotSource}
      displayUpcomingRows={displayUpcomingRows}
      subscriptionActive={subscriptionStatus.isSubscribed}
    />
  );
}
