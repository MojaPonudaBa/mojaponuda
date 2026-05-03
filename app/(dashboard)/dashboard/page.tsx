import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Calendar, Clock, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { isCompanyProfileComplete } from "@/lib/demo";
import { getRecommendedTenders } from "@/lib/tender-relevance";
import { StatCard } from "@/components/ui/stat-card";
import { DonutChart } from "@/components/ui/donut-chart";
import { LineAreaChart } from "@/components/ui/line-area-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CircularProgressScore } from "@/components/ui/circular-progress-score";
import { StatusBadge } from "@/components/ui/status-badge";
import { DecisionQueueClient, type DecisionQueueItem } from "@/components/dashboard/decision-queue-client";
import { OnboardingChecklist, type OnboardingSection } from "@/components/dashboard/onboarding-checklist";
import { formatChartValue, formatDate, formatKM, formatRelativeDate } from "@/lib/formatting";
import type { BidStatus, Json } from "@/types/database";

type TenderRow = {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  cpv_code: string | null;
  raw_description: string | null;
  ai_analysis: Json | null;
};

type BidRow = {
  id: string;
  tender_id: string;
  status: BidStatus;
  bid_value: number | null;
  created_at: string;
  tenders: {
    title: string;
    deadline: string | null;
    estimated_value: number | null;
    contracting_authority: string | null;
    cpv_code: string | null;
  } | null;
};

const statusLabels: Record<BidStatus, string> = {
  draft: "Nacrt",
  in_review: "Pregled",
  submitted: "Predano",
  won: "Dobijeno",
  lost: "Izgubljeno",
};

const statusOrder: BidStatus[] = ["draft", "in_review", "submitted", "won", "lost"];

function getFirstName(userEmail: string | null | undefined, companyName?: string | null) {
  const source = companyName?.trim() || userEmail?.split("@")[0] || "dobro došli";
  return source.split(/\s|\./)[0] || source;
}

function scoreFromRecommendation(score: number | null | undefined) {
  if (!score) return null;
  return Math.min(100, Math.max(1, Math.round(score * 10)));
}

function getTenderStatus(deadline: string | null) {
  if (!deadline) return "open";
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "closed";
  if (days <= 7) return "closing_soon";
  return "open";
}

function buildPipelineTrend(bids: BidRow[]) {
  const formatter = new Intl.DateTimeFormat("bs-BA", { month: "short" });
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      name: formatter.format(date),
      total: 0,
      expected: 0,
    };
  });
  const monthMap = new Map(months.map((month) => [month.key, month]));
  for (const bid of bids) {
    const date = new Date(bid.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = monthMap.get(key);
    if (!bucket) continue;
    const value = bid.bid_value ?? bid.tenders?.estimated_value ?? 0;
    bucket.total += value;
    bucket.expected += ["won", "submitted"].includes(bid.status) ? value * 0.65 : value * 0.42;
  }
  return months.map(({ name, total, expected }) => ({ name, total, expected }));
}

function buildOnboardingSections(input: {
  company: {
    name: string;
    jib: string | null;
    industry: string | null;
    keywords: string[] | null;
    cpv_codes: string[] | null;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  };
  savedAlertsCount: number;
  bidsCount: number;
}) {
  const profileItems = [
    { id: "company_name", label: "Naziv firme", href: "/dashboard/settings", done: Boolean(input.company.name) },
    { id: "company_identity", label: "JIB i adresa", href: "/dashboard/settings", done: Boolean(input.company.jib && input.company.address) },
    { id: "company_focus", label: "Industrija i ključne riječi", href: "/dashboard/settings", done: Boolean(input.company.industry || (input.company.keywords?.length ?? 0) > 0) },
    { id: "company_contact", label: "Kontakt podaci", href: "/dashboard/settings", done: Boolean(input.company.contact_email || input.company.contact_phone) },
  ];
  const trackingItems = [
    { id: "profile_cpv", label: "CPV kodovi profila", href: "/dashboard/cpv", done: (input.company.cpv_codes?.length ?? 0) > 0 },
    { id: "saved_alert", label: "Sačuvana pretraga", href: "/dashboard/pracenje", done: input.savedAlertsCount > 0 },
    { id: "recommended_opened", label: "Preporučeni tenderi dostupni", href: "/dashboard/tenders?tab=recommended", done: true },
    { id: "watch_area", label: "Praćenje nabavki aktivno", href: "/dashboard/pracenje", done: input.savedAlertsCount > 0 || (input.company.keywords?.length ?? 0) > 0 },
  ];
  const bidItems = [
    { id: "pipeline_created", label: "Prva ponuda u pipeline-u", href: "/dashboard/ponude", done: input.bidsCount > 0 },
    { id: "bid_workspace", label: "Radni prostor ponude", href: "/dashboard/bids", done: input.bidsCount > 0 },
    { id: "documents_ready", label: "Dokumentacija dostupna", href: "/dashboard/vault", done: input.bidsCount > 0 },
  ];
  const sections: OnboardingSection[] = [
    { title: "Profil i organizacija", completed: profileItems.filter((item) => item.done).length, total: profileItems.length, items: profileItems },
    { title: "Praćenje nabavki", completed: trackingItems.filter((item) => item.done).length, total: trackingItems.length, items: trackingItems },
    { title: "Rad na ponudama", completed: bidItems.filter((item) => item.done).length, total: bidItems.length, items: bidItems },
  ];
  const allItems = sections.flatMap((section) => section.items);
  const completedItems = allItems.filter((item) => item.done).map((item) => item.id);
  const percent = Math.round((completedItems.length / allItems.length) * 100);
  return { sections, completedItems, percent };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const subscriptionStatus = await getSubscriptionStatus(user.id, user.email, supabase);
  if (isAgencyPlan(subscriptionStatus.plan)) redirect("/dashboard/agency");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, jib, industry, keywords, cpv_codes, operating_regions, address, contact_email, contact_phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as NonNullable<typeof company>;
  const nowIso = new Date().toISOString();

  const [bidsResult, savedAlertsResult, activityResult, onboardingResult, decisionFeedbackResult] = await Promise.all([
    supabase
      .from("bids")
      .select("id, tender_id, status, bid_value, created_at, tenders(title, deadline, estimated_value, contracting_authority, cpv_code)")
      .eq("company_id", resolvedCompany.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("enabled", true),
    supabase
      .from("user_analytics")
      .select("id, event_name, route, target_id, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("user_onboarding")
      .select("confetti_shown_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("ai_feedback")
      .select("target_id, created_at")
      .eq("user_id", user.id)
      .eq("surface", "dashboard_decision_queue"),
  ]);

  const bids = (bidsResult.data ?? []) as BidRow[];
  const existingTenderIds = new Set(bids.map((bid) => bid.tender_id).filter(Boolean));
  const decisionFeedback = decisionFeedbackResult.data ?? [];
  const processedDecisionIds = new Set(decisionFeedback.map((item) => item.target_id).filter(Boolean));
  const recommended = await getRecommendedTenders<TenderRow>(supabase, resolvedCompany.id, {
    topK: 120,
    limit: 20,
    minScore: 6,
    nowIso,
  });
  const topRecommended = recommended.slice(0, 5).map((item) => ({ tender: item.tender, score: scoreFromRecommendation(item.score), confidence: item.confidence }));
  const decisionQueue: DecisionQueueItem[] = topRecommended
    .filter((item) => !existingTenderIds.has(item.tender.id) && !processedDecisionIds.has(item.tender.id))
    .slice(0, 5)
    .map((item) => ({
      id: item.tender.id,
      title: item.tender.title,
      buyer: item.tender.contracting_authority,
      value: item.tender.estimated_value,
      deadline: item.tender.deadline,
      score: item.score,
      why: item.confidence ? `AI preporuka sa ${item.confidence} pouzdanošću.` : "Usklađeno sa profilom firme i aktivnim signalima.",
    }));

  const activeBids = bids.filter((bid) => ["draft", "in_review", "submitted"].includes(bid.status));
  const wonBids = bids.filter((bid) => bid.status === "won");
  const lostBids = bids.filter((bid) => bid.status === "lost");
  const submittedBids = bids.filter((bid) => bid.status === "submitted");
  const pipelineValue = activeBids.reduce((sum, bid) => sum + (bid.bid_value ?? bid.tenders?.estimated_value ?? 0), 0);
  const expectedValue = activeBids.reduce((sum, bid) => sum + (bid.bid_value ?? bid.tenders?.estimated_value ?? 0) * 0.42, 0);
  const closedCount = wonBids.length + lostBids.length;
  const winRate = closedCount > 0 ? Math.round((wonBids.length / closedCount) * 100) : 0;

  const pipelineStages = statusOrder.map((status) => {
    const rows = bids.filter((bid) => bid.status === status);
    return {
      status,
      label: statusLabels[status],
      count: rows.length,
      value: rows.reduce((sum, bid) => sum + (bid.bid_value ?? bid.tenders?.estimated_value ?? 0), 0),
    };
  });

  const cpvMap = new Map<string, number>();
  for (const bid of bids) {
    const code = bid.tenders?.cpv_code?.slice(0, 2) || "Ostalo";
    cpvMap.set(code, (cpvMap.get(code) ?? 0) + (bid.bid_value ?? bid.tenders?.estimated_value ?? 0));
  }
  const cpvData = [...cpvMap.entries()].slice(0, 6).map(([name, value], index) => ({
    name,
    value,
    color: ["#2563eb", "#7c3aed", "#059669", "#f59e0b", "#ef4444", "#06b6d4"][index % 6],
  }));
  const pipelineTrend = buildPipelineTrend(bids);

  const onboarding = buildOnboardingSections({
    company: resolvedCompany,
    savedAlertsCount: savedAlertsResult.count ?? 0,
    bidsCount: bids.length,
  });

  const computedCompletion = {
    percent: onboarding.percent,
    sections: onboarding.sections.map((section) => ({ title: section.title, completed: section.completed, total: section.total })),
  } satisfies Json;

  const activities = activityResult.data ?? [];
  const firstName = getFirstName(user.email, resolvedCompany.name);
  const todayKey = new Date().toISOString().slice(0, 10);
  const processedToday = decisionFeedback.some((item) => item.created_at?.slice(0, 10) === todayKey);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-[var(--text-primary)]">Dobro došli, {firstName}! 👋</h1>
          <p className="mt-1 text-body text-[var(--text-secondary)]">Evo pregleda vaših aktivnosti i prilika</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline">
            <Calendar className="size-4" /> Posljednjih 30 dana
          </Button>
          <Button asChild>
            <Link href="/dashboard/tenders"><Plus className="size-4" />Nova pretraga</Link>
          </Button>
        </div>
      </header>

      <DecisionQueueClient items={decisionQueue} processed={processedToday} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Pipeline vrijednost" value={formatKM(pipelineValue)} description="Aktivne ponude" iconName="BarChart3" iconColor="blue" />
        <StatCard title="Aktivne ponude" value={activeBids.length} description={`${submittedBids.length} predano`} iconName="Briefcase" iconColor="green" />
        <StatCard title="Preporučeni tenderi" value={topRecommended.length} description="Top AI signali" iconName="Sparkles" iconColor="purple" />
        <StatCard title="Dobijene ponude" value={wonBids.length} description={`${closedCount} zatvorenih ishoda`} iconName="Trophy" iconColor="amber" />
        <StatCard title="Očekivana vrijednost" value={formatKM(expectedValue)} description="Ponderisano pipeline-om" iconName="Target" iconColor="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-h2 text-[var(--text-primary)]">Pipeline pregled</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Ponude grupisane po statusu i vrijednosti.</p>
            </div>
            <Link className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/ponude">Vidi pipeline →</Link>
          </div>
          <div className="mt-5 overflow-x-auto pb-2">
            <div className="grid min-w-[720px] grid-cols-5 items-stretch gap-2">
            {pipelineStages.map((stage) => (
              <div key={stage.status} className="rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-tertiary)]">{stage.label}</p>
                <p className="mt-2 text-h2 text-[var(--text-primary)]">{stage.count}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatChartValue(stage.value)} KM</p>
              </div>
            ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-h3 text-[var(--text-primary)]">Vrijednost pipeline-a</h3>
            <div className="flex rounded-full bg-[var(--surface-2)] p-1">
              <span className="rounded-full bg-[var(--surface-1)] px-3 py-1 text-sm font-semibold text-[var(--primary)] shadow-[var(--shadow-card)]">Mjesečno</span>
              <span className="px-3 py-1 text-sm font-semibold text-[var(--text-secondary)]">Godišnje</span>
            </div>
          </div>
          <div className="mt-4">
            <LineAreaChart
              data={pipelineTrend}
              height={220}
              series={[
                { key: "total", name: "Ukupna vrijednost" },
                { key: "expected", name: "Očekivana vrijednost", color: "var(--success)" },
              ]}
            />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h2 text-[var(--text-primary)]">Top preporučeni tenderi</h2>
              <Link href="/dashboard/tenders?tab=recommended" className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">Vidi sve</Link>
            </div>
            <div className="mt-4 space-y-3">
              {topRecommended.length > 0 ? topRecommended.map((item) => (
                <article className="rounded-[var(--radius-input)] border border-[var(--border-default)] p-3 hover:bg-[var(--surface-2)]" key={item.tender.id}>
                  <div className="flex gap-3">
                    <CircularProgressScore score={item.score ?? 0} showLabel={false} size="sm" />
                    <Link href={`/dashboard/tenders/${item.tender.id}`} className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{item.tender.title}</h3>
                      <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{item.tender.contracting_authority ?? "Nepoznat naručilac"}</p>
                    </Link>
                    <Button asChild aria-label="Otvori tender" size="icon" type="button" variant="ghost">
                      <Link href={`/dashboard/tenders/${item.tender.id}`}><Bookmark className="h-4 w-4 text-[var(--text-tertiary)]" /></Link>
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">{formatKM(item.tender.estimated_value)}</span>
                    <span>·</span>
                    <span>{formatDate(item.tender.deadline)}</span>
                    <StatusBadge status={getTenderStatus(item.tender.deadline)} />
                  </div>
                </article>
              )) : <EmptyState title="Nema preporuka" description="Dopunite profil firme da sistem jasnije rangira tendere." icon="search" className="min-h-48" />}
            </div>
          </section>
          <OnboardingChecklist
            sections={onboarding.sections}
            percent={onboarding.percent}
            completedItems={onboarding.completedItems}
            computedCompletion={computedCompletion}
            confettiAlreadyShown={Boolean(onboardingResult.data?.confetti_shown_at)}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h2 text-[var(--text-primary)]">Aktivnost u posljednjih 7 dana</h2>
            <Link className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/pracenje">Vidi sve</Link>
          </div>
          <div className="mt-4 space-y-4">
            {activities.length > 0 ? activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Clock className="size-4" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{activity.event_name.replaceAll("_", " ")}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">{activity.route ?? "Dashboard"}</p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">{formatRelativeDate(activity.created_at)}</p>
                </div>
              </div>
            )) : <EmptyState title="Nema aktivnosti" description="Aktivnosti će se pojaviti nakon korištenja dashboarda." icon="inbox" className="min-h-56" />}
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h2 text-[var(--text-primary)]">Vrijednost po kategorijama</h2>
            <Link className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/cpv">Vidi sve</Link>
          </div>
          <DonutChart data={cpvData} centerLabel="ukupno" centerValue={`${formatChartValue(cpvData.reduce((sum, item) => sum + item.value, 0))} KM`} height={260} />
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h2 text-[var(--text-primary)]">Win rate analiza</h2>
            <Link className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/trziste">Vidi sve</Link>
          </div>
          <p className="mt-5 text-[40px] font-bold leading-none text-[var(--text-primary)] tabular-nums">{winRate}%</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Stopa uspješnosti</p>
          <LineAreaChart
            className="mt-5"
            data={[
              { name: "Dobijeno", rate: wonBids.length },
              { name: "Izgubljeno", rate: lostBids.length },
              { name: "Trenutno", rate: winRate },
            ]}
            height={140}
            series={[{ key: "rate", name: "Win rate" }]}
            showLegend={false}
          />
        </section>
      </div>
    </section>
  );
}
