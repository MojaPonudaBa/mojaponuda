import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  Filter,
  Grid3X3,
  Kanban,
  List,
  ListChecks,
  Search,
  Users,
} from "lucide-react";

import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityPill } from "@/components/ui/priority-pill";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import {
  daysUntil,
  formatDateBs,
  formatKm,
  getTrackingDashboardData,
  type TrackingItem,
} from "@/lib/dashboard-c2";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    tab?: string;
    view?: string;
    q?: string;
  }>;
};

const tabs = [
  { key: "aktivni", label: "Aktivni" },
  { key: "predati", label: "Predati" },
  { key: "evaluacija", label: "U evaluaciji" },
  { key: "zavrseni", label: "Zavrseni" },
  { key: "obustavljeni", label: "Obustavljeni" },
];

const views = [
  { key: "list", label: "Lista", icon: List },
  { key: "kanban", label: "Kanban", icon: Kanban },
  { key: "grid", label: "Grid", icon: Grid3X3 },
  { key: "calendar", label: "Kalendar", icon: CalendarDays },
];

export default async function PracenjePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolvedSearchParams.tab ?? "aktivni";
  const activeView = resolvedSearchParams.view ?? "list";
  const query = resolvedSearchParams.q?.trim().toLowerCase() ?? "";
  const data = await getTrackingDashboardData(supabase, user.id);
  const filteredItems = data.items
    .filter((item) => matchesTab(item, activeTab))
    .filter((item) => {
      if (!query) return true;
      return [item.title, item.buyer, item.cpvCode, item.nextStep].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  const totalValue = data.items.reduce((sum, item) => sum + Number(item.bidValue ?? item.estimatedValue ?? 0), 0);
  const checklistTotal = data.items.reduce((sum, item) => sum + item.checklistTotal, 0);
  const checklistDone = data.items.reduce((sum, item) => sum + item.checklistDone, 0);
  const activeCount = data.statusCounts.draft + data.statusCounts.in_review;
  const submittedCount = data.statusCounts.submitted;
  const finishedCount = data.statusCounts.won + data.statusCounts.lost;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            <ListChecks className="size-3.5 text-[var(--primary)]" aria-hidden="true" />
            Aktivni tenderi kroz proces ponude
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Pracenje ponuda</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Operativni pregled tendera koje ste vec pretvorili u ponude, sa rokovima, checklistom i sljedecim korakom.
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard/ponude">
            <Kanban className="size-4" aria-hidden="true" />
            Otvori tok ponuda
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Aktivni" value={activeCount} description="Nacrti i revizije" iconName="ListChecks" iconColor="blue" />
        <StatCard title="Predati" value={submittedCount} description="Cekaju evaluaciju" iconName="FileCheck2" iconColor="cyan" />
        <StatCard title="Rok 7 dana" value={data.dueSoon.length} description="Potrebna paznja" iconName="Clock" iconColor="amber" />
        <StatCard title="Zavrseni" value={finishedCount} description={`${data.statusCounts.won} dobijeno`} iconName="CheckCircle2" iconColor="green" />
        <StatCard title="Dokumenti" value={`${checklistDone}/${checklistTotal}`} description="Checklist pokrivenost" iconName="FileCheck2" iconColor="purple" />
        <StatCard title="Vrijednost" value={formatKm(totalValue)} description="Ponude/procjene u pracenju" iconName="Users" iconColor="rose" />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button key={tab.key} asChild variant={activeTab === tab.key ? "default" : "outline"} size="sm">
                <Link href={`/dashboard/pracenje?tab=${tab.key}&view=${activeView}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
                  {tab.label}
                </Link>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex min-w-0 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-1.5">
              <Search className="size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Pretraga"
                className="w-44 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <input type="hidden" name="tab" value={activeTab} />
              <input type="hidden" name="view" value={activeView} />
            </form>
            <Button variant="outline" size="sm">
              <Filter className="size-4" aria-hidden="true" />
              Filteri
            </Button>
            <div className="flex rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] p-1">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <Link
                    key={view.key}
                    href={`/dashboard/pracenje?tab=${activeTab}&view=${view.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors",
                      activeView === view.key && "bg-[var(--surface-1)] text-[var(--primary)] shadow-[var(--shadow-card)]",
                    )}
                    title={view.label}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Tenderi u pracenju" subtitle={`${filteredItems.length} stavki u trenutnom prikazu`}>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="size-7" aria-hidden="true" />}
              title="Nema stavki"
              description="Nema ponuda koje odgovaraju trenutnom statusu ili filteru."
            />
          ) : activeView === "kanban" ? (
            <KanbanView items={filteredItems} />
          ) : activeView === "grid" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredItems.map((item) => (
                <TrackingCard key={item.id} item={item} />
              ))}
            </div>
          ) : activeView === "calendar" ? (
            <CalendarView items={filteredItems} />
          ) : (
            <TrackingTable items={filteredItems} />
          )}
        </Panel>

        <aside className="space-y-4">
          <Panel title="Rokovi 7 dana" subtitle="Najblizi blokeri">
            {data.dueSoon.length > 0 ? (
              <div className="space-y-3">
                {data.dueSoon.map((item) => (
                  <Link key={item.id} href={`/dashboard/bids/${item.bidId}`} className="block rounded-[var(--radius-input)] border border-[var(--border-default)] p-3 hover:bg-[var(--surface-2)]">
                    <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--warning-strong)]">Rok: {formatDateBs(item.deadline)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Clock className="size-7" aria-hidden="true" />} title="Nema hitnih rokova" className="min-h-48" />
            )}
          </Panel>

          <AIInsightBox title="Brzi uvid" variant="suggestion">
            <p>{data.quickInsight}</p>
          </AIInsightBox>

          <Panel title="Najaktivniji narucioci" subtitle="Po broju ponuda">
            {data.activeAuthorities.length > 0 ? (
              <div className="space-y-2">
                {data.activeAuthorities.map((authority) => (
                  <div key={authority.name} className="flex items-center justify-between rounded-[var(--radius-input)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <span className="truncate text-[var(--text-primary)]">{authority.name}</span>
                    <span className="font-semibold text-[var(--primary)]">{authority.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Users className="size-7" aria-hidden="true" />} title="Nema narucilaca" className="min-h-48" />
            )}
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function matchesTab(item: TrackingItem, tab: string) {
  if (tab === "predati") return item.status === "submitted";
  if (tab === "evaluacija") return item.status === "in_review";
  if (tab === "zavrseni") return item.status === "won" || item.status === "lost";
  if (tab === "obustavljeni") return false;
  return item.status === "draft" || item.status === "in_review";
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TrackingTable({ items }: { items: TrackingItem[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
          <tr>
            <th className="px-4 py-3 text-left">Tender</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Sljedeci korak</th>
            <th className="px-4 py-3 text-right">Rok</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-default)] bg-[var(--surface-1)]">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <Link href={`/dashboard/bids/${item.bidId}`} className="font-semibold text-[var(--text-primary)] hover:text-[var(--primary)]">
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">{item.buyer}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={item.status === "in_review" ? "in_progress" : item.status} />
                  <PriorityPill priority={item.priority} />
                </div>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{item.nextStep}</td>
              <td className="px-4 py-3 text-right text-[var(--text-primary)]">{formatDateBs(item.deadline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrackingCard({ item }: { item: TrackingItem }) {
  const progress = item.checklistTotal > 0 ? Math.round((item.checklistDone / item.checklistTotal) * 100) : 0;

  return (
    <Link href={`/dashboard/bids/${item.bidId}`} className="block rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
        <PriorityPill priority={item.priority} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-tertiary)]">{item.buyer}</p>
      <div className="mt-4 h-2 rounded-full bg-[var(--surface-2)]">
        <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.nextStep}</p>
    </Link>
  );
}

function KanbanView({ items }: { items: TrackingItem[] }) {
  const columns = [
    { key: "draft", label: "Aktivni" },
    { key: "in_review", label: "U evaluaciji" },
    { key: "submitted", label: "Predati" },
    { key: "done", label: "Zavrseni" },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {columns.map((column) => {
        const columnItems = items.filter((item) => (column.key === "done" ? item.status === "won" || item.status === "lost" : item.status === column.key));
        return (
          <div key={column.key} className="rounded-[var(--radius-input)] bg-[var(--surface-2)] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{column.label}</h3>
              <span className="text-xs font-bold text-[var(--text-tertiary)]">{columnItems.length}</span>
            </div>
            <div className="space-y-2">
              {columnItems.map((item) => (
                <TrackingCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ items }: { items: TrackingItem[] }) {
  const sorted = items
    .filter((item) => item.deadline)
    .sort((a, b) => new Date(a.deadline ?? "").getTime() - new Date(b.deadline ?? "").getTime());

  if (sorted.length === 0) {
    return <EmptyState icon={<CalendarDays className="size-7" aria-hidden="true" />} title="Nema rokova" description="Ponude u ovom prikazu nemaju upisan rok." />;
  }

  return (
    <div className="space-y-2">
      {sorted.map((item) => (
        <Link key={item.id} href={`/dashboard/bids/${item.bidId}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-default)] p-3 hover:bg-[var(--surface-2)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">{item.buyer}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--primary)]">{formatDateBs(item.deadline)}</p>
            <p className="text-xs text-[var(--text-secondary)]">{daysUntil(item.deadline) ?? "-"} dana</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
