import { notFound, redirect } from "next/navigation";
import { DashboardHomeOverview } from "@/components/dashboard/home-overview";
import { getProfileOptionLabel } from "@/lib/company-profile";
import { getPersonalizedTenderRecommendations } from "@/lib/personalized-tenders";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import {
  buildRecommendationContext,
  RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
  RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
} from "@/lib/tender-recommendations";
import { getPreparationUsageSummary } from "@/lib/preparation-credits";
import type { BidStatus } from "@/types/database";

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

function buildPreparationStatus(
  summary: Awaited<ReturnType<typeof getPreparationUsageSummary>>,
  agencyClientId: string,
) {
  return {
    label: "Pripreme klijenta",
    value: `${summary.totalRemaining} dostupno`,
    description: `${summary.includedRemaining} od ${summary.includedLimit} mjesečnih priprema još je slobodno, uz ${summary.purchasedRemaining} kupljenih u rezervi za ovog klijenta.`,
    href: `/dashboard/subscription?agencyClientId=${agencyClientId}#pripreme`,
    cta: summary.totalRemaining > 0 ? "Pregledaj stanje" : "Dodaj paket priprema",
  };
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

  const subscriptionStatus = await getSubscriptionStatus(user.id, user.email, supabase);
  const { plan } = subscriptionStatus;
  if (plan.id !== "agency") redirect("/dashboard");

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
    id: string;
    name: string;
    jib: string;
    industry: string | null;
    keywords: string[] | null;
    cpv_codes: string[] | null;
    operating_regions: string[] | null;
  } | null;

  if (!company) notFound();

  const recommendationContext = buildRecommendationContext({
    industry: company.industry,
    keywords: company.keywords,
    cpv_codes: company.cpv_codes,
    operating_regions: company.operating_regions,
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const clientBase = `/dashboard/agency/clients/${agencyClientId}`;

  const [
    { count: activeBidsCount },
    { count: wonBidsCount },
    { count: lostBidsCount },
    { data: expiringDocs },
    { data: allBidRowsData },
    { count: documentsCountValue },
  ] = await Promise.all([
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id)
      .in("status", ["draft", "in_review", "submitted"]),
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("status", "won"),
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("status", "lost"),
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
  ]);

  const expiring = (expiringDocs ?? []) as Array<{
    id: string;
    name: string;
    type: string | null;
    expires_at: string;
  }>;

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
    ["draft", "in_review", "submitted"].includes(bid.status),
  );
  const urgentBidDeadlines = activePortfolioBids
    .filter((bid) => bid.tenders.deadline)
    .sort((first, second) => new Date(first.tenders.deadline!).getTime() - new Date(second.tenders.deadline!).getTime())
    .slice(0, 4);
  const submittedCount = activePortfolioBids.filter((bid) => bid.status === "submitted").length;
  const inReviewCount = activePortfolioBids.filter((bid) => bid.status === "in_review").length;
  const displayWonBids = wonBidsCount ?? 0;
  const displayLostBids = lostBidsCount ?? 0;
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

  const tenderRecommendationResult = await getPersonalizedTenderRecommendations<{
    id: string;
    title: string;
    deadline: string | null;
    estimated_value: number | null;
    contracting_authority: string | null;
    contracting_authority_jib: string | null;
    contract_type: string | null;
    raw_description: string | null;
  }>(supabase, {
    company,
    companyId: company.id,
    select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description",
    nowIso,
    candidateLimit: RECOMMENDATION_FULL_PAGE_CANDIDATE_LIMIT,
    minimumResults: RECOMMENDATION_FULL_PAGE_MINIMUM_RESULTS,
    excludeTenderIds: existingBidTenderIds,
    limit: 4,
    rerank: false,
  });

  const relevantTenders = tenderRecommendationResult.recommendations.map(({ tender }) => tender);

  const relevantTenderCount = tenderRecommendationResult.totalCount;
  const relevantTenderValue = relevantTenders.reduce((sum, tender) => sum + (Number(tender.estimated_value) || 0), 0);
  const documentsCount = documentsCountValue ?? 0;
  const nextDeadlineInDays = urgentBidDeadlines[0]?.tenders.deadline
    ? daysUntil(urgentBidDeadlines[0].tenders.deadline)
    : null;
  const warningCount = expiring.length + missingChecklistCount;
  const profileLabel = recommendationContext.profile.primaryIndustry
    ? getProfileOptionLabel(recommendationContext.profile.primaryIndustry)
    : null;

  const nextAction = urgentBidDeadlines[0]
    ? {
        title: "Prvo riješite najbliži rok",
        description: `Ponuda "${urgentBidDeadlines[0].tenders.title}" je najbliže roku i traži pažnju prije ostalih zadataka.`,
        href: `/dashboard/bids/${urgentBidDeadlines[0].id}`,
        cta: "Otvori ponudu",
        meta: formatDeadlineMeta(nextDeadlineInDays),
        tone: "critical" as const,
      }
    : missingChecklistCount > 0
      ? {
          title: "Dovršite otvorene stavke",
          description: `Imate ${missingChecklistCount} stavki koje još mogu usporiti predaju za ovog klijenta.`,
          href: `${clientBase}/bids`,
          cta: "Otvori ponude",
          meta: `${missingChecklistCount} otvorenih stavki`,
          tone: "attention" as const,
        }
      : expiring.length > 0
        ? {
            title: "Provjerite dokumente",
            description: `${expiring.length} dokumenata uskoro ističe i vrijedi ih zatvoriti prije sljedeće prijave.`,
            href: `${clientBase}/documents`,
            cta: "Otvori dokumente",
            meta: `${expiring.length} dokumenata pred istekom`,
            tone: "attention" as const,
          }
        : relevantTenders[0]
          ? {
              title: "Pogledajte novu priliku",
              description: `Tender "${relevantTenders[0].title}" izgleda kao kvalitetan fit za profil ovog klijenta.`,
              href: `${clientBase}/tenders/${relevantTenders[0].id}`,
              cta: "Otvori tender",
              meta: `${relevantTenderCount} relevantnih tendera`,
              tone: "opportunity" as const,
            }
            : {
                title: "Otvorite tendere klijenta",
                description: "Provjerite tendere i odmah otvorite najzanimljivije prilike za ovog klijenta.",
                href: `${clientBase}/tenders`,
                cta: "Idi na tendere",
                meta: "Nema hitnih blokera",
              tone: "neutral" as const,
            };

  const focusCards = [
    {
      title: "Aktivne ponude",
      value: String((activeBidsCount ?? 0) > 0 ? (activeBidsCount ?? 0) : activePortfolioBids.length),
      meta: `${submittedCount} predane · ${inReviewCount} u pripremi`,
      href: `${clientBase}/bids`,
      icon: "briefcase" as const,
    },
    {
      title: "Relevantne prilike",
      value: String(relevantTenderCount),
      meta: relevantTenderCount > 0
        ? relevantTenderValue > 0
          ? `Poznata vrijednost ${formatCompactCurrency(relevantTenderValue)}`
          : "Najbolje prilike iz profila klijenta"
        : "Dopunite profil za jasnije preporuke",
      href: `${clientBase}/tenders`,
      icon: "search" as const,
    },
    {
      title: "Nepriloženi dokumenti",
      value: String(warningCount),
      meta: `${expiring.length} dokumenta · ${missingChecklistCount} otvorenih stavki`,
      href: warningCount > 0 ? `${clientBase}/bids` : `${clientBase}/documents`,
      icon: "bell" as const,
    },
    {
      title: "Ishod ponuda",
      value: winRate !== null ? `${winRate}%` : String(displayWonBids),
      meta: winRate !== null
        ? `${displayWonBids} dobijeno · ${displayLostBids} izgubljeno`
        : `${displayWonBids} dobijene ponude`,
      href: `${clientBase}/bids`,
      icon: "trend" as const,
    },
  ];

  const actionQueue = [
    ...urgentBidDeadlines.slice(0, 3).map((bid) => ({
      id: `deadline-${bid.id}`,
      title: bid.tenders.title,
      description: `Rok za predaju je ${bid.tenders.deadline ? formatDaysLabel(daysUntil(bid.tenders.deadline)) : "uskoro"}.`,
      href: `${clientBase}/bids`,
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
          href: `${clientBase}/tenders/${relevantTenders[0].id}`,
          badge: "Nova prilika",
          tone: "opportunity" as const,
        }]
      : []),
  ].slice(0, 5);

  const quickLinks = [
    {
      label: "Tenderi klijenta",
      href: `${clientBase}/tenders`,
      description: relevantTenderCount > 0
        ? `${relevantTenderCount} preporuka čeka pregled`
        : "Otvorite kompletan tender pregled za klijenta",
    },
    {
      label: "Ponude klijenta",
      href: `${clientBase}/bids`,
      description: activePortfolioBids.length > 0
        ? `${activePortfolioBids.length} aktivnih ponuda u radu`
        : "Pokrenite radni prostor za tender koji vrijedi pripremati",
    },
    {
      label: "Dokumenti klijenta",
      href: `${clientBase}/documents`,
      description: documentsCount > 0
        ? `${documentsCount} dokumenata u spremištu`
        : "Dodajte osnovne dokumente za bržu pripremu prijava",
    },
  ];

  const preparationSummary = await getPreparationUsageSummary(supabase, {
    userId: user.id,
    companyId: company.id,
    plan,
    subscription: subscriptionStatus.subscription,
  });

  return (
    <DashboardHomeOverview
      companyName={company.name}
      currentPlanName="Agencijski klijent"
      profileLabel={profileLabel}
      nextAction={nextAction}
      focusCards={focusCards}
      actionQueue={actionQueue}
      dashboardBidRows={portfolioBids.slice(0, 6)}
      recommendedTenders={relevantTenders.slice(0, 4).map((tender) => ({
        id: tender.id,
        title: tender.title,
        deadline: tender.deadline,
        estimated_value: tender.estimated_value,
        contracting_authority: tender.contracting_authority,
      }))}
      quickLinks={quickLinks}
      preparationStatus={buildPreparationStatus(preparationSummary, agencyClientId)}
      subscriptionActive
      isLocked={false}
      bidHrefBase={`${clientBase}/bids`}
      tenderHrefBase={`${clientBase}/tenders`}
    />
  );
}
