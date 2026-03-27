import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getProfileOptionLabel } from "@/lib/company-profile";
import { DashboardHomeOverview } from "@/components/dashboard/home-overview";
import { getCompetitorAnalysis } from "@/lib/market-intelligence";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  selectTenderRecommendations,
} from "@/lib/tender-recommendations";
import type { BidStatus } from "@/types/database";

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

export default async function AgencyClientHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agencyClientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (plan.id !== "agency") redirect("/dashboard");

  // Fetch agency client + company
  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select(`
      id, company_id,
      companies (
        id, name, jib, industry, keywords, cpv_codes, operating_regions
      )
    `)
    .eq("id", agencyClientId)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as {
    id: string; name: string; jib: string;
    industry: string | null; keywords: string[] | null;
    cpv_codes: string[] | null; operating_regions: string[] | null;
  } | null;

  if (!company) notFound();

  const recommendationContext = buildRecommendationContext({
    industry: company.industry,
    keywords: company.keywords,
    cpv_codes: company.cpv_codes,
    operating_regions: company.operating_regions,
  });

  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();
  const today = nowIso.split("T")[0];

  // Parallel data fetching
  const [
    { count: activeBidsCount },
    { count: wonBidsCount },
    { count: lostBidsCount },
    { data: expiringDocs },
    { data: allBidRowsData },
    { count: documentsCountValue },
    { data: upcomingRowsData },
  ] = await Promise.all([
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id).in("status", ["draft", "in_review", "submitted"]),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "won"),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "lost"),
    supabase
      .from("documents")
      .select("id, name, type, expires_at")
      .eq("company_id", company.id)
      .not("expires_at", "is", null)
      .lte("expires_at", sixtyDaysFromNow)
      .gte("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("bids")
      .select("id, tender_id, status, created_at, tenders(title, deadline, estimated_value, contracting_authority)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("planned_procurements")
      .select("id, description, planned_date, estimated_value, contract_type, contracting_authorities(name, jib)")
      .gte("planned_date", today)
      .order("planned_date", { ascending: true })
      .limit(3),
  ]);

  const expiring = (expiringDocs ?? []) as { id: string; name: string; type: string | null; expires_at: string }[];
  const documentsCount = documentsCountValue ?? 0;

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
    allBidRows.map((bid) => bid.tender_id).filter(Boolean)
  );

  const portfolioBids = allBidRows.map((bid) => ({
    id: bid.id,
    status: bid.status,
    created_at: bid.created_at,
    tenders: bid.tenders ?? {
      title: "Nepoznat tender",
      deadline: null,
      estimated_value: null,
      contracting_authority: null,
    },
  }));

  const activePortfolioBids = portfolioBids.filter((bid) =>
    ["draft", "in_review", "submitted"].includes(bid.status)
  );
  const urgentBidDeadlines = activePortfolioBids
    .filter((bid) => bid.tenders.deadline)
    .sort((a, b) => new Date(a.tenders.deadline!).getTime() - new Date(b.tenders.deadline!).getTime())
    .slice(0, 4);
  const submittedCount = activePortfolioBids.filter((bid) => bid.status === "submitted").length;
  const inReviewCount = activePortfolioBids.filter((bid) => bid.status === "in_review").length;
  const displayWonBids = wonBidsCount ?? 0;
  const displayLostBids = lostBidsCount ?? 0;
  const closedBidsCount = displayWonBids + displayLostBids;
  const winRate = closedBidsCount > 0 ? Math.round((displayWonBids / closedBidsCount) * 100) : null;
  const wonEstimatedValue = portfolioBids
    .filter((bid) => bid.status === "won")
    .reduce((sum, bid) => sum + (Number(bid.tenders.estimated_value) || 0), 0);

  let missingChecklistCount = 0;
  const activeBidIds = activePortfolioBids.map((bid) => bid.id);
  if (activeBidIds.length > 0) {
    const { data: checklistOverview } = await supabase
      .from("bid_checklist_items")
      .select("status")
      .in("bid_id", activeBidIds);
    missingChecklistCount = checklistOverview?.filter((item) => item.status === "missing").length ?? 0;
  }

  // Recommended tenders
  let relevantTenders: {
    id: string;
    title: string;
    deadline: string | null;
    estimated_value: number | null;
    contracting_authority: string | null;
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
      { minimumResults: 4 }
    );
    relevantTenders = rankedRelevantTenders.slice(0, 12).map(({ tender }) => tender);
  }

  const relevantTenderCount = relevantTenders.length;
  const relevantTenderValue = relevantTenders.reduce(
    (sum, tender) => sum + (Number(tender.estimated_value) || 0),
    0
  );

  // Top authorities from relevant tenders
  const topAuthoritiesMap = new Map<string, { name: string; count: number; totalValue: number }>();
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
  const topRelevantAuthoritiesSource = topRelevantAuthorities.length > 0 ? "live" as const : "empty" as const;

  // Competitor analysis
  const resolvedCompetitorAnalysis = await getCompetitorAnalysis(supabase, {
    jib: company.jib,
    industry: company.industry,
    keywords: company.keywords || [],
    operating_regions: company.operating_regions || [],
  });

  let competitorSnapshot: { name: string; jib: string; wins: number; total_value: number; win_rate: number | null }[] = [];
  let competitorSnapshotSource: "live" | "demo" | "empty" = "empty";
  if (resolvedCompetitorAnalysis) {
    competitorSnapshot = resolvedCompetitorAnalysis.competitors.slice(0, 3).map((c) => ({
      name: c.name,
      jib: c.jib,
      wins: c.wins,
      total_value: c.total_value,
      win_rate: c.win_rate,
    }));
    if (competitorSnapshot.length > 0) competitorSnapshotSource = "live";
  }

  const upcomingRows = ((upcomingRowsData ?? []) as {
    id: string;
    description: string | null;
    planned_date: string | null;
    estimated_value: number | null;
    contract_type: string | null;
    contracting_authorities: { name: string; jib: string } | null;
  }[]);

  const profileLabel = recommendationContext.profile.primaryIndustry
    ? getProfileOptionLabel(recommendationContext.profile.primaryIndustry)
    : null;

  const warningCount = expiring.length + missingChecklistCount;
  const nextDeadlineInDays = urgentBidDeadlines[0]?.tenders.deadline
    ? daysUntil(urgentBidDeadlines[0].tenders.deadline)
    : null;

  // Build links scoped to agency client paths
  const clientBase = `/dashboard/agency/clients/${agencyClientId}`;

  const nextAction = urgentBidDeadlines[0]
    ? {
        title: "Prvo riješite najbliži rok",
        description: `Ponuda "${urgentBidDeadlines[0].tenders.title}" je najbliže roku.`,
        href: `/dashboard/bids/${urgentBidDeadlines[0].id}`,
        cta: "Otvori ponudu",
        meta: formatDeadlineMeta(nextDeadlineInDays),
        tone: "critical" as const,
      }
    : missingChecklistCount > 0
      ? {
          title: "Dovršite otvorene stavke",
          description: `Imate ${missingChecklistCount} stavki koje još mogu usporiti predaju ponude.`,
          href: `${clientBase}/bids`,
          cta: "Otvori ponude",
          meta: `${missingChecklistCount} otvorenih stavki`,
          tone: "attention" as const,
        }
      : expiring.length > 0
        ? {
            title: "Provjerite dokumente",
            description: `${expiring.length} dokumenata uskoro ističe.`,
            href: `${clientBase}/documents`,
            cta: "Otvori dokumente",
            meta: `${expiring.length} dokumenata pred istekom`,
            tone: "attention" as const,
          }
        : relevantTenders[0]
          ? {
              title: "Pogledajte novi tender",
              description: `Tender "${relevantTenders[0].title}" izgleda kao realna prilika.`,
              href: `/dashboard/tenders/${relevantTenders[0].id}`,
              cta: "Otvori tender",
              meta: `${relevantTenderCount} relevantnih tendera`,
              tone: "opportunity" as const,
            }
          : {
              title: "Otvorite pregled prilika",
              description: "Pogledajte nove tendere koji odgovaraju profilu klijenta.",
              href: `${clientBase}/tenders`,
              cta: "Idi na preporuke",
              meta: "Nema hitnih blokera",
              tone: "neutral" as const,
            };

  const focusCards = [
    {
      title: "Aktivne ponude",
      value: String(activePortfolioBids.length),
      meta: `${submittedCount} predane · ${inReviewCount} u provjeri`,
      href: `${clientBase}/bids`,
      icon: "briefcase" as const,
    },
    {
      title: "Relevantne prilike",
      value: String(relevantTenderCount),
      meta:
        relevantTenderCount > 0
          ? relevantTenderValue > 0
            ? `Poznata vrijednost ${formatCompactCurrency(relevantTenderValue)}`
            : "Najbolje prilike iz profila klijenta"
          : "Dopunite profil za jasnije prijedloge",
      href: `${clientBase}/tenders`,
      icon: "search" as const,
    },
    {
      title: "Rizici za provjeru",
      value: String(warningCount),
      meta: `${expiring.length} dokumenta · ${missingChecklistCount} otvorenih stavki`,
      href: warningCount > 0 ? `${clientBase}/bids` : `${clientBase}/documents`,
      icon: "bell" as const,
    },
    {
      title: "Ishod ponuda",
      value: winRate !== null ? `${winRate}%` : String(displayWonBids),
      meta: winRate !== null ? `${displayWonBids} dobijeno · ${displayLostBids} izgubljeno` : `${displayWonBids} dobijene ponude`,
      href: `${clientBase}/bids`,
      icon: "trend" as const,
    },
  ];

  const actionQueue = [
    ...urgentBidDeadlines.slice(0, 3).map((bid) => ({
      id: `deadline-${bid.id}`,
      title: bid.tenders.title,
      description: `Rok za predaju je ${bid.tenders.deadline ? formatDaysLabel(daysUntil(bid.tenders.deadline)) : "uskoro"}.`,
      href: `/dashboard/bids/${bid.id}`,
      badge: bid.tenders.deadline ? formatDaysLabel(daysUntil(bid.tenders.deadline)) : "Rok",
      tone: "critical" as const,
    })),
    ...(missingChecklistCount > 0
      ? [{
          id: "checklist-warning",
          title: "Zatvorite otvorene stavke",
          description: "Otvorite ponude i uklonite stvari koje mogu zaustaviti predaju.",
          href: `${clientBase}/bids`,
          badge: `${missingChecklistCount} stavki`,
          tone: "attention" as const,
        }]
      : []),
    ...(expiring.length > 0
      ? [{
          id: "documents-warning",
          title: "Provjerite dokumente pred istekom",
          description: `${expiring.length} dokumenata uskoro treba obnovu.`,
          href: `${clientBase}/documents`,
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

  const dashboardBidRows = portfolioBids.slice(0, 6);

  return (
    <DashboardHomeOverview
      companyName={company.name}
      currentPlanName="Agencijski klijent"
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
      displayUpcomingRows={upcomingRows}
      subscriptionActive={true}
      isLocked={false}
    />
  );
}
