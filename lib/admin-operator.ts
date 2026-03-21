import type { User } from "@supabase/supabase-js";
import { getAdminEmails } from "@/lib/admin";
import { loadAdminPortalLeadsData } from "@/lib/admin-portal-leads";
import { getPlanFromVariantId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, Database, Subscription } from "@/types/database";

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "past_due"]);
type SyncLogRow = Database["public"]["Tables"]["sync_log"]["Row"];

type AdminLeadStatus = "new" | "contacted" | "converted" | "dead";

export interface AdminActivityEvent {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export interface AdminOverviewData {
  generatedAt: string;
  business: {
    revenueToday: number;
    revenueMonth: number;
    activeSubscriptions: number;
    newSignups24h: number;
    newSignups7d: number;
  };
  funnel: {
    newLeads: number;
    convertedLeads: number;
    conversionRate: number;
  };
  alerts: {
    failedJobs: number;
    syncErrors: number;
    expiringSubscriptions: number;
  };
  activity: AdminActivityEvent[];
}

export interface AdminFinancialEvent {
  id: string;
  title: string;
  description: string;
  amount: number;
  occurredAt: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export interface AdminFinancialsData {
  generatedAt: string;
  mrr: number;
  totalRevenue: number;
  revenueToday: number;
  revenueMonth: number;
  failedPayments: number;
  churnRate: number | null;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  recentEvents: AdminFinancialEvent[];
}

export interface AdminSystemJob {
  endpoint: string;
  label: string;
  status: "U redu" | "Treba pažnju" | "Nema podataka";
  lastRun: string | null;
  recordsAdded: number;
  recordsUpdated: number;
  durationLabel: string;
  plainMessage: string;
}

export interface AdminSystemIssue {
  id: string;
  title: string;
  description: string;
  occurredAt: string | null;
  tone: "warning" | "danger";
}

export interface AdminSystemData {
  generatedAt: string;
  summary: {
    healthyJobs: number;
    attentionJobs: number;
    failedJobs: number;
    lastSyncAt: string | null;
  };
  jobs: AdminSystemJob[];
  issues: AdminSystemIssue[];
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isWithinDays(value: string | null | undefined, days: number): boolean {
  if (!value) {
    return false;
  }

  return Date.now() - new Date(value).getTime() <= days * DAY_MS;
}

function isWithinHours(value: string | null | undefined, hours: number): boolean {
  if (!value) {
    return false;
  }

  return Date.now() - new Date(value).getTime() <= hours * 60 * 60 * 1000;
}

function toDateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

function toMonthKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 7);
}

function getAmountForSubscription(subscription: Pick<Subscription, "lemonsqueezy_variant_id">): number {
  return getPlanFromVariantId(subscription.lemonsqueezy_variant_id ?? null).price;
}

function getSyncEndpointLabel(endpoint: string): string {
  switch (endpoint) {
    case "MorningSync4AM":
      return "Jutarnji glavni sync";
    case "ProcurementNotices":
      return "Tenderi";
    case "ContractingAuthorities":
      return "Ugovorni organi";
    case "ContractingAuthorityMaintenance4AM":
      return "Održavanje organa";
    case "TenderAreaMaintenance4AM":
      return "Geo održavanje tendera";
    case "Awards":
      return "Dodjele ugovora";
    case "PlannedProcurements":
      return "Planirane nabavke";
    case "Suppliers":
      return "Dobavljači";
    default:
      return endpoint;
  }
}

function getSyncFreshness(ranAt: string | null): "healthy" | "warning" | "stale" | "unknown" {
  if (!ranAt) {
    return "unknown";
  }

  const ageHours = (Date.now() - new Date(ranAt).getTime()) / (1000 * 60 * 60);

  if (ageHours <= 30) {
    return "healthy";
  }

  if (ageHours <= 54) {
    return "warning";
  }

  return "stale";
}

function getSyncPlainMessage(freshness: ReturnType<typeof getSyncFreshness>): string {
  switch (freshness) {
    case "healthy":
      return "Posljednji prolaz izgleda svježe i ne traži akciju.";
    case "warning":
      return "Prolaz postoji, ali više nije dovoljno svjež za miran jutarnji pregled.";
    case "stale":
      return "Ovo kasni predugo i treba provjeru što prije.";
    default:
      return "Za ovaj job još nema zabilježenog prolaza u logu.";
  }
}

function normalizeLeadStatus(value: string | null | undefined): AdminLeadStatus {
  switch ((value ?? "").trim().toLowerCase()) {
    case "contacted":
    case "kontaktiran":
    case "u_toku":
      return "contacted";
    case "converted":
    case "konvertovan":
      return "converted";
    case "dead":
    case "mrtav":
    case "pauza":
      return "dead";
    default:
      return "new";
  }
}

async function listAllUsers(): Promise<User[]> {
  const admin = createAdminClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Ne mogu učitati korisnike: ${error.message}`);
    }

    const rows = data?.users ?? [];
    users.push(...rows);

    if (rows.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function loadAdminBaseData() {
  const admin = createAdminClient();
  const [users, companiesResult, subscriptionsResult, syncResult] = await Promise.all([
    listAllUsers(),
    admin.from("companies").select("id, user_id, name, created_at"),
    admin
      .from("subscriptions")
      .select("id, user_id, lemonsqueezy_variant_id, status, current_period_end, created_at")
      .order("created_at", { ascending: false }),
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

  if (syncResult.error) {
    throw new Error(`Ne mogu učitati sync log: ${syncResult.error.message}`);
  }

  const adminEmailSet = new Set(getAdminEmails().map((email) => normalizeEmail(email)));
  const customerUsers = users.filter((user) => !adminEmailSet.has(normalizeEmail(user.email)));
  const customerUserIdSet = new Set(customerUsers.map((user) => user.id));
  const companies = ((companiesResult.data ?? []) as Pick<Company, "id" | "user_id" | "name" | "created_at">[]).filter((company) =>
    customerUserIdSet.has(company.user_id)
  );
  const subscriptions = ((subscriptionsResult.data ?? []) as Pick<
    Subscription,
    "id" | "user_id" | "lemonsqueezy_variant_id" | "status" | "current_period_end" | "created_at"
  >[]).filter((subscription) => customerUserIdSet.has(subscription.user_id));
  const syncRows = (syncResult.data ?? []) as SyncLogRow[];

  return {
    customerUsers,
    companies,
    subscriptions,
    syncRows,
  };
}

function buildSystemJobs(syncRows: SyncLogRow[]): AdminSystemJob[] {
  const latestByEndpoint = new Map<string, SyncLogRow>();

  for (const row of syncRows) {
    const current = latestByEndpoint.get(row.endpoint);
    if (!current || new Date(row.ran_at).getTime() > new Date(current.ran_at).getTime()) {
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
    const freshness = getSyncFreshness(row?.ran_at ?? null);

    return {
      endpoint,
      label: getSyncEndpointLabel(endpoint),
      status:
        freshness === "healthy"
          ? "U redu"
          : freshness === "unknown"
            ? "Nema podataka"
            : "Treba pažnju",
      lastRun: row?.ran_at ?? null,
      recordsAdded: row?.records_added ?? 0,
      recordsUpdated: row?.records_updated ?? 0,
      durationLabel: "Trajanje nije zabilježeno",
      plainMessage: getSyncPlainMessage(freshness),
    };
  });
}

export async function loadAdminOverviewData(): Promise<AdminOverviewData> {
  const [{ customerUsers, subscriptions, syncRows }, leadsData] = await Promise.all([
    loadAdminBaseData(),
    loadAdminPortalLeadsData(),
  ]);

  const now = Date.now();
  const todayKey = toDateKey(new Date(now));
  const monthKey = toMonthKey(new Date(now));
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active").length;
  const revenueToday = subscriptions.reduce((sum, subscription) => {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) || toDateKey(subscription.created_at) !== todayKey) {
      return sum;
    }

    return sum + getAmountForSubscription(subscription);
  }, 0);
  const revenueMonth = subscriptions.reduce((sum, subscription) => {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) || toMonthKey(subscription.created_at) !== monthKey) {
      return sum;
    }

    return sum + getAmountForSubscription(subscription);
  }, 0);
  const newSignups24h = customerUsers.filter((user) => isWithinHours(user.created_at, 24)).length;
  const newSignups7d = customerUsers.filter((user) => isWithinDays(user.created_at, 7)).length;

  const leadStatuses = leadsData.leads.map((lead) => normalizeLeadStatus(lead.outreachStatus));
  const newLeads = leadStatuses.filter((status) => status === "new").length;
  const convertedLeads = leadStatuses.filter((status) => status === "converted").length;
  const conversionRate = leadsData.leads.length > 0 ? Math.round((convertedLeads / leadsData.leads.length) * 100) : 0;

  const jobs = buildSystemJobs(syncRows);
  const failedJobs = jobs.filter((job) => job.status === "Nema podataka").length;
  const syncErrors = jobs.filter((job) => job.status !== "U redu").length;
  const expiringSubscriptions = subscriptions.filter(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() >= now &&
      new Date(subscription.current_period_end).getTime() <= now + 7 * DAY_MS
  ).length;

  const signupEvents: AdminActivityEvent[] = customerUsers.slice(0, 10).map((user) => ({
    id: `signup-${user.id}`,
    title: "Nova registracija",
    description: user.email ?? "Korisnik bez emaila",
    occurredAt: user.created_at,
    tone: "neutral",
  }));

  const subscriptionEvents: AdminActivityEvent[] = subscriptions.slice(0, 10).map((subscription) => ({
    id: `subscription-${subscription.id}`,
    title:
      subscription.status === "past_due"
        ? "Naplata nije prošla"
        : subscription.status === "cancelled"
          ? "Pretplata otkazana"
          : "Nova pretplata",
    description: `${getPlanFromVariantId(subscription.lemonsqueezy_variant_id ?? null).name} · ${subscription.status}`,
    occurredAt: subscription.current_period_end ?? subscription.created_at,
    tone:
      subscription.status === "past_due"
        ? "danger"
        : subscription.status === "cancelled"
          ? "warning"
          : "success",
  }));

  const syncEvents: AdminActivityEvent[] = jobs
    .filter((job) => job.status !== "U redu")
    .map((job) => ({
      id: `sync-${job.endpoint}`,
      title: `${job.label} traži pažnju`,
      description: job.plainMessage,
      occurredAt: job.lastRun ?? new Date().toISOString(),
      tone: job.status === "Nema podataka" ? "danger" : "warning",
    }));

  const activity = [...signupEvents, ...subscriptionEvents, ...syncEvents]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    business: {
      revenueToday,
      revenueMonth,
      activeSubscriptions,
      newSignups24h,
      newSignups7d,
    },
    funnel: {
      newLeads,
      convertedLeads,
      conversionRate,
    },
    alerts: {
      failedJobs,
      syncErrors,
      expiringSubscriptions,
    },
    activity,
  };
}

export async function loadAdminFinancialsData(): Promise<AdminFinancialsData> {
  const { subscriptions } = await loadAdminBaseData();
  const now = Date.now();
  const todayKey = toDateKey(new Date(now));
  const monthKey = toMonthKey(new Date(now));

  const mrr = subscriptions.reduce((sum, subscription) => {
    if (subscription.status !== "active") {
      return sum;
    }

    return sum + getAmountForSubscription(subscription);
  }, 0);

  const totalRevenue = subscriptions.reduce((sum, subscription) => {
    if (!["active", "past_due", "cancelled"].includes(subscription.status)) {
      return sum;
    }

    return sum + getAmountForSubscription(subscription);
  }, 0);

  const revenueToday = subscriptions.reduce((sum, subscription) => {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) || toDateKey(subscription.created_at) !== todayKey) {
      return sum;
    }

    return sum + getAmountForSubscription(subscription);
  }, 0);

  const revenueMonth = subscriptions.reduce((sum, subscription) => {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) || toMonthKey(subscription.created_at) !== monthKey) {
      return sum;
    }

    return sum + getAmountForSubscription(subscription);
  }, 0);

  const failedPayments = subscriptions.filter((subscription) => subscription.status === "past_due").length;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active").length;
  const paidSubscriptionsEver = subscriptions.filter((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) || subscription.status === "cancelled").length;
  const cancelledSubscriptions = subscriptions.filter((subscription) => subscription.status === "cancelled").length;
  const churnRate = paidSubscriptionsEver > 0 ? Math.round((cancelledSubscriptions / paidSubscriptionsEver) * 100) : null;
  const expiringSubscriptions = subscriptions.filter(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() >= now &&
      new Date(subscription.current_period_end).getTime() <= now + 7 * DAY_MS
  ).length;

  const recentEvents = subscriptions.slice(0, 10).map<AdminFinancialEvent>((subscription) => ({
    id: subscription.id,
    title:
      subscription.status === "past_due"
        ? "Neuspjela naplata"
        : subscription.status === "cancelled"
          ? "Pretplata otkazana"
          : "Nova aktivna pretplata",
    description: `${getPlanFromVariantId(subscription.lemonsqueezy_variant_id ?? null).name} · ${subscription.status}`,
    amount: getAmountForSubscription(subscription),
    occurredAt: subscription.current_period_end ?? subscription.created_at,
    tone:
      subscription.status === "past_due"
        ? "danger"
        : subscription.status === "cancelled"
          ? "warning"
          : "success",
  }));

  return {
    generatedAt: new Date().toISOString(),
    mrr,
    totalRevenue,
    revenueToday,
    revenueMonth,
    failedPayments,
    churnRate,
    activeSubscriptions,
    expiringSubscriptions,
    recentEvents,
  };
}

export async function loadAdminSystemData(): Promise<AdminSystemData> {
  const { syncRows } = await loadAdminBaseData();
  const jobs = buildSystemJobs(syncRows);
  const issues = jobs
    .filter((job) => job.status !== "U redu")
    .map<AdminSystemIssue>((job) => ({
      id: job.endpoint,
      title: job.label,
      description: job.plainMessage,
      occurredAt: job.lastRun,
      tone: job.status === "Nema podataka" ? "danger" : "warning",
    }));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      healthyJobs: jobs.filter((job) => job.status === "U redu").length,
      attentionJobs: jobs.filter((job) => job.status === "Treba pažnju").length,
      failedJobs: jobs.filter((job) => job.status === "Nema podataka").length,
      lastSyncAt: jobs
        .map((job) => job.lastRun)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null,
    },
    jobs,
    issues,
  };
}
