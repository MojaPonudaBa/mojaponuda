import type { User } from "@supabase/supabase-js";
import { isCompanyProfileComplete } from "@/lib/demo";
import { getPlanFromVariantId, PLANS, type PlanTier } from "@/lib/plans";
import { parseCompanyProfile, getProfileOptionLabel } from "@/lib/company-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Company,
  Subscription,
  Document,
  Bid,
  Tender,
  ContractingAuthority,
  AwardDecision,
  PlannedProcurement,
  Json,
  Database,
} from "@/types/database";

type SyncLogRow = Database["public"]["Tables"]["sync_log"]["Row"];

interface CompanyUsageSnapshot {
  documentsCount: number;
  storageBytes: number;
  expiringDocuments30d: number;
  totalBids: number;
  activeBids: number;
  submittedBids: number;
  wonBids: number;
  lostBids: number;
  lastActivityAt: string | null;
}

export interface AdminDashboardRow {
  userId: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  companyName: string | null;
  jib: string | null;
  onboardingStatus: string;
  primaryIndustryLabel: string | null;
  regionsLabel: string;
  planName: string;
  planId: PlanTier | "none";
  subscriptionStatus: string;
  documentsCount: number;
  activeBids: number;
  totalBids: number;
  storageBytes: number;
  lastActivityAt: string | null;
  commercialSignal: string;
}

export interface AdminPlanDistributionItem {
  planId: PlanTier;
  planName: string;
  activeCount: number;
  pastDueCount: number;
  estimatedMrr: number;
}

export interface AdminSyncStatusItem {
  endpoint: string;
  ranAt: string | null;
  recordsAdded: number;
  recordsUpdated: number;
  freshness: "healthy" | "warning" | "stale" | "unknown";
}

export interface AdminDashboardData {
  generatedAt: string;
  summary: {
    totalUsers: number;
    newUsers30d: number;
    companiesCount: number;
    completedProfiles: number;
    activeSubscriptions: number;
    pastDueSubscriptions: number;
    estimatedActiveMrr: number;
    estimatedAtRiskMrr: number;
    activeBids: number;
    openTenders: number;
  };
  funnel: {
    signedInLast7Days: number;
    companySetupRate: number;
    profileCompletionRate: number;
    payingConversionRate: number;
  };
  revenue: {
    estimatedActiveMrr: number;
    estimatedAtRiskMrr: number;
    projectedArr: number;
    renewalsNext30d: number;
    newPaying30d: number;
  };
  planDistribution: AdminPlanDistributionItem[];
  topIndustries: Array<{ label: string; companies: number }>;
  recentUsers: AdminDashboardRow[];
  portfolioAccounts: AdminDashboardRow[];
  businessSignals: {
    upgradeCandidates: number;
    reactivationTargets: number;
    onboardingStalls: number;
    highIntentAccounts: number;
  };
  operations: {
    totalDocuments: number;
    totalStorageBytes: number;
    expiringDocuments30d: number;
    totalBids: number;
    submittedBids: number;
    wonBids: number;
    lostBids: number;
    winRate: number | null;
    totalTenders: number;
    openTenders: number;
    openTenderValue: number;
    missingTenderAreas: number;
    authoritiesMissingGeo: number;
    plannedProcurements90d: number;
    plannedValue90d: number;
    awards30d: number;
    averageBidders30d: number | null;
    realizedMarketValue30d: number;
    syncStatuses: AdminSyncStatusItem[];
  };
  roadmap: Array<{
    title: string;
    description: string;
    phase: string;
    priority: "high" | "medium";
  }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "past_due"]);

function isRecordWithinDays(dateValue: string | null | undefined, days: number): boolean {
  if (!dateValue) {
    return false;
  }

  return Date.now() - new Date(dateValue).getTime() <= days * DAY_MS;
}

function getLatestDate(...values: Array<string | null | undefined>): string | null {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) {
    return null;
  }

  return valid.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function getSubscriptionPriority(status: string): number {
  switch (status) {
    case "active":
      return 5;
    case "past_due":
      return 4;
    case "on_trial":
      return 3;
    case "cancelled":
      return 2;
    default:
      return 1;
  }
}

function pickLatestSubscription(subscriptions: Subscription[]): Subscription | null {
  if (subscriptions.length === 0) {
    return null;
  }

  return [...subscriptions].sort((a, b) => {
    const priorityDiff = getSubscriptionPriority(b.status) - getSubscriptionPriority(a.status);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0] ?? null;
}

function getPrimaryIndustryLabel(industry: string | null): string | null {
  const parsed = parseCompanyProfile(industry);
  return parsed.primaryIndustry ? getProfileOptionLabel(parsed.primaryIndustry) : null;
}

function getRegionsLabel(company: Pick<Company, "operating_regions"> | null): string {
  const regions = company?.operating_regions?.filter(Boolean) ?? [];
  if (regions.length === 0) {
    return "Nisu postavljene";
  }

  return regions.slice(0, 2).join(", ") + (regions.length > 2 ? ` +${regions.length - 2}` : "");
}

function hasAreaLabel(aiAnalysis: Json | null): boolean {
  if (!aiAnalysis || typeof aiAnalysis !== "object" || Array.isArray(aiAnalysis)) {
    return false;
  }

  const geoEnrichment = "geo_enrichment" in aiAnalysis ? aiAnalysis.geo_enrichment : null;
  if (!geoEnrichment || typeof geoEnrichment !== "object" || Array.isArray(geoEnrichment)) {
    return false;
  }

  const areaLabel = "area_label" in geoEnrichment ? geoEnrichment.area_label : null;
  return typeof areaLabel === "string" && areaLabel.trim().length > 0;
}

function buildSyncStatuses(syncRows: SyncLogRow[]): AdminSyncStatusItem[] {
  const latestByEndpoint = new Map<string, SyncLogRow>();

  for (const row of syncRows) {
    const existing = latestByEndpoint.get(row.endpoint);
    if (!existing || new Date(row.ran_at).getTime() > new Date(existing.ran_at).getTime()) {
      latestByEndpoint.set(row.endpoint, row);
    }
  }

  const trackedEndpoints = [
    "MorningSync4AM",
    "ProcurementNotices",
    "ContractingAuthorities",
    "ContractingAuthorityMaintenance4AM",
    "TenderAreaMaintenance4AM",
    "Awards",
    "PlannedProcurements",
    "Suppliers",
  ];

  return trackedEndpoints.map((endpoint) => {
    const row = latestByEndpoint.get(endpoint) ?? null;

    if (!row) {
      return {
        endpoint,
        ranAt: null,
        recordsAdded: 0,
        recordsUpdated: 0,
        freshness: "unknown" as const,
      };
    }

    const ageHours = (Date.now() - new Date(row.ran_at).getTime()) / (1000 * 60 * 60);
    const freshness = ageHours <= 30 ? "healthy" : ageHours <= 54 ? "warning" : "stale";

    return {
      endpoint,
      ranAt: row.ran_at,
      recordsAdded: row.records_added,
      recordsUpdated: row.records_updated,
      freshness,
    };
  });
}

function getCommercialSignal(input: {
  subscription: Subscription | null;
  usage: CompanyUsageSnapshot;
  onboardingComplete: boolean;
  hasCompany: boolean;
  lastSignInAt: string | null;
  planId: PlanTier | "none";
}): string {
  if (!input.hasCompany) {
    return "Bez otvorene firme";
  }

  if (!input.onboardingComplete) {
    return "Zastoj u onboardingu";
  }

  if (input.subscription?.status === "past_due") {
    return "Naplata u riziku";
  }

  if (!input.subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(input.subscription.status)) {
    if (input.usage.activeBids > 0 || input.usage.documentsCount > 0 || isRecordWithinDays(input.lastSignInAt, 14)) {
      return "Spreman za aktivaciju";
    }

    return "Bez aktivne pretplate";
  }

  if (input.planId === "basic" && (input.usage.activeBids > 3 || input.usage.documentsCount > 30)) {
    return "Kandidat za Puni paket";
  }

  if (input.planId === "pro" && (input.usage.activeBids > 15 || input.usage.documentsCount > 120)) {
    return "Kandidat za Agencijski paket";
  }

  if (!isRecordWithinDays(input.usage.lastActivityAt ?? input.lastSignInAt, 30)) {
    return "Niska aktivnost";
  }

  return "Stabilan račun";
}

async function listAllUsers() {
  const admin = createAdminClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Ne mogu učitati korisnike: ${error.message}`);
    }

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

export async function loadAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const [users, companiesResult, subscriptionsResult, documentsResult, bidsResult, tendersResult, authoritiesResult, awardsResult, plannedResult, syncResult] = await Promise.all([
    listAllUsers(),
    admin
      .from("companies")
      .select("id, user_id, name, jib, contact_email, contact_phone, industry, keywords, operating_regions, created_at"),
    admin
      .from("subscriptions")
      .select("id, user_id, lemonsqueezy_variant_id, status, current_period_end, created_at"),
    admin
      .from("documents")
      .select("company_id, size, expires_at, created_at"),
    admin
      .from("bids")
      .select("company_id, status, created_at"),
    admin
      .from("tenders")
      .select("id, deadline, estimated_value, contract_type, status, ai_analysis, created_at"),
    admin
      .from("contracting_authorities")
      .select("id, city, municipality, canton, entity"),
    admin
      .from("award_decisions")
      .select("winning_price, estimated_value, total_bidders_count, award_date, created_at"),
    admin
      .from("planned_procurements")
      .select("estimated_value, planned_date, created_at"),
    admin
      .from("sync_log")
      .select("id, endpoint, last_sync_at, records_added, records_updated, ran_at")
      .order("ran_at", { ascending: false })
      .limit(200),
  ]);

  if (companiesResult.error) {
    throw new Error(`Ne mogu učitati firme: ${companiesResult.error.message}`);
  }
  if (subscriptionsResult.error) {
    throw new Error(`Ne mogu učitati pretplate: ${subscriptionsResult.error.message}`);
  }
  if (documentsResult.error) {
    throw new Error(`Ne mogu učitati dokumente: ${documentsResult.error.message}`);
  }
  if (bidsResult.error) {
    throw new Error(`Ne mogu učitati ponude: ${bidsResult.error.message}`);
  }
  if (tendersResult.error) {
    throw new Error(`Ne mogu učitati tendere: ${tendersResult.error.message}`);
  }
  if (authoritiesResult.error) {
    throw new Error(`Ne mogu učitati naručioce: ${authoritiesResult.error.message}`);
  }
  if (awardsResult.error) {
    throw new Error(`Ne mogu učitati odluke o dodjeli: ${awardsResult.error.message}`);
  }
  if (plannedResult.error) {
    throw new Error(`Ne mogu učitati planirane nabavke: ${plannedResult.error.message}`);
  }
  if (syncResult.error) {
    throw new Error(`Ne mogu učitati sync log: ${syncResult.error.message}`);
  }

  const companies = (companiesResult.data ?? []) as Pick<Company, "id" | "user_id" | "name" | "jib" | "contact_email" | "contact_phone" | "industry" | "keywords" | "operating_regions" | "created_at">[];
  const subscriptions = (subscriptionsResult.data ?? []) as Pick<Subscription, "id" | "user_id" | "lemonsqueezy_variant_id" | "status" | "current_period_end" | "created_at">[];
  const documents = (documentsResult.data ?? []) as Pick<Document, "company_id" | "size" | "expires_at" | "created_at">[];
  const bids = (bidsResult.data ?? []) as Pick<Bid, "company_id" | "status" | "created_at">[];
  const tenders = (tendersResult.data ?? []) as Pick<Tender, "id" | "deadline" | "estimated_value" | "contract_type" | "status" | "ai_analysis" | "created_at">[];
  const authorities = (authoritiesResult.data ?? []) as Pick<ContractingAuthority, "id" | "city" | "municipality" | "canton" | "entity">[];
  const awards = (awardsResult.data ?? []) as Pick<AwardDecision, "winning_price" | "estimated_value" | "total_bidders_count" | "award_date" | "created_at">[];
  const plannedProcurements = (plannedResult.data ?? []) as Pick<PlannedProcurement, "estimated_value" | "planned_date" | "created_at">[];
  const syncRows = (syncResult.data ?? []) as SyncLogRow[];

  const companyByUserId = new Map(companies.map((company) => [company.user_id, company]));
  const subscriptionsByUserId = new Map<string, Subscription[]>();
  const usageByCompanyId = new Map<string, CompanyUsageSnapshot>();
  const industryCounts = new Map<string, number>();
  const planDistributionMap = new Map<PlanTier, AdminPlanDistributionItem>(
    (Object.keys(PLANS) as PlanTier[]).map((planId) => [
      planId,
      {
        planId,
        planName: PLANS[planId].name,
        activeCount: 0,
        pastDueCount: 0,
        estimatedMrr: 0,
      },
    ])
  );

  for (const subscription of subscriptions) {
    const list = subscriptionsByUserId.get(subscription.user_id) ?? [];
    list.push(subscription as Subscription);
    subscriptionsByUserId.set(subscription.user_id, list);
  }

  for (const company of companies) {
    const industryLabel = getPrimaryIndustryLabel(company.industry);
    if (industryLabel) {
      industryCounts.set(industryLabel, (industryCounts.get(industryLabel) ?? 0) + 1);
    }

    usageByCompanyId.set(company.id, {
      documentsCount: 0,
      storageBytes: 0,
      expiringDocuments30d: 0,
      totalBids: 0,
      activeBids: 0,
      submittedBids: 0,
      wonBids: 0,
      lostBids: 0,
      lastActivityAt: null,
    });
  }

  const now = Date.now();
  const in30Days = now + 30 * DAY_MS;
  const in90Days = now + 90 * DAY_MS;

  for (const document of documents) {
    const snapshot = usageByCompanyId.get(document.company_id);
    if (!snapshot) {
      continue;
    }

    snapshot.documentsCount += 1;
    snapshot.storageBytes += Number(document.size) || 0;
    snapshot.lastActivityAt = getLatestDate(snapshot.lastActivityAt, document.created_at);

    if (document.expires_at) {
      const expiryTime = new Date(document.expires_at).getTime();
      if (expiryTime >= now && expiryTime <= in30Days) {
        snapshot.expiringDocuments30d += 1;
      }
    }
  }

  for (const bid of bids) {
    const snapshot = usageByCompanyId.get(bid.company_id);
    if (!snapshot) {
      continue;
    }

    snapshot.totalBids += 1;
    snapshot.lastActivityAt = getLatestDate(snapshot.lastActivityAt, bid.created_at);

    if (["draft", "in_review", "submitted"].includes(bid.status)) {
      snapshot.activeBids += 1;
    }
    if (bid.status === "submitted") {
      snapshot.submittedBids += 1;
    }
    if (bid.status === "won") {
      snapshot.wonBids += 1;
    }
    if (bid.status === "lost") {
      snapshot.lostBids += 1;
    }
  }

  const dashboardRows: AdminDashboardRow[] = users.map((user) => {
    const company = companyByUserId.get(user.id) ?? null;
    const usage = company ? usageByCompanyId.get(company.id) : null;
    const subscription = pickLatestSubscription(subscriptionsByUserId.get(user.id) ?? []);
    const isSubscribed = Boolean(subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status));
    const plan = isSubscribed
      ? getPlanFromVariantId(subscription?.lemonsqueezy_variant_id || null)
      : null;
    const onboardingComplete = company ? isCompanyProfileComplete(company as Company) : false;
    const commercialSignal = getCommercialSignal({
      subscription,
      usage: usage ?? {
        documentsCount: 0,
        storageBytes: 0,
        expiringDocuments30d: 0,
        totalBids: 0,
        activeBids: 0,
        submittedBids: 0,
        wonBids: 0,
        lostBids: 0,
        lastActivityAt: null,
      },
      onboardingComplete,
      hasCompany: Boolean(company),
      lastSignInAt: user.last_sign_in_at ?? null,
      planId: plan?.id ?? "none",
    });

    if (plan) {
      const bucket = planDistributionMap.get(plan.id);
      if (bucket) {
        if (subscription?.status === "active") {
          bucket.activeCount += 1;
          bucket.estimatedMrr += plan.price;
        } else if (subscription?.status === "past_due") {
          bucket.pastDueCount += 1;
        }
      }
    }

    return {
      userId: user.id,
      email: user.email ?? "Bez emaila",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      companyName: company?.name ?? null,
      jib: company?.jib ?? null,
      onboardingStatus: !company ? "Nema firme" : onboardingComplete ? "Završen" : "U toku",
      primaryIndustryLabel: company ? getPrimaryIndustryLabel(company.industry) : null,
      regionsLabel: getRegionsLabel(company),
      planName: plan?.name ?? "Bez aktivne pretplate",
      planId: plan?.id ?? "none",
      subscriptionStatus: subscription?.status ?? "inactive",
      documentsCount: usage?.documentsCount ?? 0,
      activeBids: usage?.activeBids ?? 0,
      totalBids: usage?.totalBids ?? 0,
      storageBytes: usage?.storageBytes ?? 0,
      lastActivityAt: getLatestDate(usage?.lastActivityAt, user.last_sign_in_at ?? null),
      commercialSignal,
    };
  });

  const totalUsers = users.length;
  const companiesCount = companies.length;
  const completedProfiles = companies.filter((company) => isCompanyProfileComplete(company as Company)).length;
  const activeSubscriptions = dashboardRows.filter((row) => row.subscriptionStatus === "active").length;
  const pastDueSubscriptions = dashboardRows.filter((row) => row.subscriptionStatus === "past_due").length;
  const estimatedActiveMrr = [...planDistributionMap.values()].reduce((sum, item) => sum + item.estimatedMrr, 0);
  const estimatedAtRiskMrr = dashboardRows.reduce((sum, row) => {
    if (row.subscriptionStatus !== "past_due") {
      return sum;
    }

    return sum + (row.planId !== "none" ? PLANS[row.planId].price : 0);
  }, 0);

  const totalDocuments = documents.length;
  const totalStorageBytes = documents.reduce((sum, document) => sum + (Number(document.size) || 0), 0);
  const expiringDocuments30d = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.expiringDocuments30d, 0);
  const totalBids = bids.length;
  const activeBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.activeBids, 0);
  const submittedBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.submittedBids, 0);
  const wonBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.wonBids, 0);
  const lostBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.lostBids, 0);
  const winRate = wonBids + lostBids > 0 ? Math.round((wonBids / (wonBids + lostBids)) * 100) : null;

  const openTendersList = tenders.filter((tender) => {
    if (!tender.deadline) {
      return false;
    }

    return new Date(tender.deadline).getTime() >= now;
  });
  const openTenders = openTendersList.length;
  const openTenderValue = openTendersList.reduce((sum, tender) => sum + (Number(tender.estimated_value) || 0), 0);
  const missingTenderAreas = tenders.filter((tender) => !hasAreaLabel(tender.ai_analysis)).length;
  const authoritiesMissingGeo = authorities.filter(
    (authority) => !authority.city && !authority.municipality && !authority.canton && !authority.entity
  ).length;

  const plannedProcurements90d = plannedProcurements.filter((plan) => {
    if (!plan.planned_date) {
      return false;
    }

    const planTime = new Date(plan.planned_date).getTime();
    return planTime >= now && planTime <= in90Days;
  });
  const plannedValue90d = plannedProcurements90d.reduce(
    (sum, plan) => sum + (Number(plan.estimated_value) || 0),
    0
  );

  const awards30dRows = awards.filter((award) => {
    const baseDate = award.award_date ?? award.created_at;
    return isRecordWithinDays(baseDate, 30);
  });
  const awards30d = awards30dRows.length;
  const averageBidders30d = awards30dRows.filter((award) => award.total_bidders_count !== null).length > 0
    ? Number(
        (
          awards30dRows.reduce((sum, award) => sum + (award.total_bidders_count || 0), 0) /
          awards30dRows.filter((award) => award.total_bidders_count !== null).length
        ).toFixed(1)
      )
    : null;
  const realizedMarketValue30d = awards30dRows.reduce(
    (sum, award) => sum + (Number(award.winning_price) || 0),
    0
  );

  const newUsers30d = users.filter((user) => isRecordWithinDays(user.created_at, 30)).length;
  const signedInLast7Days = users.filter((user) => isRecordWithinDays(user.last_sign_in_at, 7)).length;
  const companySetupRate = totalUsers > 0 ? Math.round((companiesCount / totalUsers) * 100) : 0;
  const profileCompletionRate = companiesCount > 0 ? Math.round((completedProfiles / companiesCount) * 100) : 0;
  const payingConversionRate = totalUsers > 0 ? Math.round(((activeSubscriptions + pastDueSubscriptions) / totalUsers) * 100) : 0;
  const renewalsNext30d = subscriptions.filter(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() >= now &&
      new Date(subscription.current_period_end).getTime() <= in30Days
  ).length;
  const newPaying30d = subscriptions.filter(
    (subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) && isRecordWithinDays(subscription.created_at, 30)
  ).length;

  const upgradeCandidates = dashboardRows.filter((row) =>
    row.commercialSignal === "Kandidat za Puni paket" || row.commercialSignal === "Kandidat za Agencijski paket"
  ).length;
  const reactivationTargets = dashboardRows.filter(
    (row) =>
      row.commercialSignal === "Spreman za aktivaciju" &&
      row.onboardingStatus === "Završen" &&
      isRecordWithinDays(row.lastSignInAt, 30)
  ).length;
  const onboardingStalls = dashboardRows.filter(
    (row) => row.onboardingStatus !== "Završen" && isRecordWithinDays(row.createdAt, 30) === false
  ).length;
  const highIntentAccounts = dashboardRows.filter(
    (row) => row.activeBids > 0 || row.documentsCount >= 5
  ).length;

  const recentUsers = [...dashboardRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
  const portfolioAccounts = [...dashboardRows]
    .filter((row) => row.companyName)
    .sort((a, b) => {
      const activityDiff = (b.activeBids + b.documentsCount) - (a.activeBids + a.documentsCount);
      if (activityDiff !== 0) {
        return activityDiff;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 12);
  const topIndustries = [...industryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, companies]) => ({ label, companies }));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers,
      newUsers30d,
      companiesCount,
      completedProfiles,
      activeSubscriptions,
      pastDueSubscriptions,
      estimatedActiveMrr,
      estimatedAtRiskMrr,
      activeBids,
      openTenders,
    },
    funnel: {
      signedInLast7Days,
      companySetupRate,
      profileCompletionRate,
      payingConversionRate,
    },
    revenue: {
      estimatedActiveMrr,
      estimatedAtRiskMrr,
      projectedArr: estimatedActiveMrr * 12,
      renewalsNext30d,
      newPaying30d,
    },
    planDistribution: [...planDistributionMap.values()],
    topIndustries,
    recentUsers,
    portfolioAccounts,
    businessSignals: {
      upgradeCandidates,
      reactivationTargets,
      onboardingStalls,
      highIntentAccounts,
    },
    operations: {
      totalDocuments,
      totalStorageBytes,
      expiringDocuments30d,
      totalBids,
      submittedBids,
      wonBids,
      lostBids,
      winRate,
      totalTenders: tenders.length,
      openTenders,
      openTenderValue,
      missingTenderAreas,
      authoritiesMissingGeo,
      plannedProcurements90d: plannedProcurements90d.length,
      plannedValue90d,
      awards30d,
      averageBidders30d,
      realizedMarketValue30d,
      syncStatuses: buildSyncStatuses(syncRows),
    },
    roadmap: [
      {
        title: "Billing i naplata audit",
        description: "Webhook audit, neuspjele naplate, refundi i detaljni billing trail po računu.",
        phase: "Sljedeće",
        priority: "high",
      },
      {
        title: "Kohorte i aktivacija",
        description: "Praćenje aktivacije po cohorti: registracija, onboarding, prvi tender, prva ponuda, prva uplata.",
        phase: "Sljedeće",
        priority: "high",
      },
      {
        title: "Customer health scoring",
        description: "Računi pod rizikom churn-a, pad aktivnosti, pad logina, istek pretplate i signal za prodajni follow-up.",
        phase: "Naredna iteracija",
        priority: "high",
      },
      {
        title: "Tender-to-bid conversion",
        description: "Koliko preporučenih tendera prelazi u otvorene bid workspaces i koji segmenti imaju najbolju konverziju.",
        phase: "Naredna iteracija",
        priority: "medium",
      },
      {
        title: "Lemon Squeezy order history",
        description: "Stvarna historija uplata, LTV, naplaćeni prihodi po mjesecu i planu, ne samo procijenjeni MRR.",
        phase: "Kasnije",
        priority: "medium",
      },
      {
        title: "Support i account ops",
        description: "Interni notes, status korisničkih upita, ručne oznake računa i komercijalni follow-up pipeline.",
        phase: "Kasnije",
        priority: "medium",
      },
    ],
  };
}
