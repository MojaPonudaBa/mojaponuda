import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  BellRing,
  History,
  Search,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";

import { AlertCreatorClient } from "@/components/dashboard/alert-creator-client";
import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateBs,
  getAlertsDashboardData,
  type AlertCard,
} from "@/lib/dashboard-c2";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

const tabs = [
  { key: "alerti", label: "Moji alerti", icon: Bell },
  { key: "pretrage", label: "Sacuvane pretrage", icon: Search },
  { key: "istorija", label: "Istorija obavjestenja", icon: History },
  { key: "postavke", label: "Podesavanja", icon: Settings },
];

export default async function AlertiPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolvedSearchParams.tab ?? "alerti";
  const data = await getAlertsDashboardData(supabase, user.id);
  const activeAlerts = data.alerts.filter((alert) => alert.enabled);
  const avgQuality = data.alerts.length
    ? Math.round(data.alerts.reduce((sum, alert) => sum + alert.qualityScore, 0) / data.alerts.length)
    : 0;
  const unreadNotifications = data.notifications.filter((notification) => !notification.read_at).length;
  const winsFromAlerts = data.alerts.reduce((sum, alert) => sum + alert.winsCount, 0);
  const latestParse = data.parseHistory[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            <BellRing className="size-3.5 text-[var(--primary)]" aria-hidden="true" />
            Alerti i sacuvane pretrage
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Alerti</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Upravljajte alertima, historijom obavjestenja i kvalitetom pretraga koje vode do korisnih tendera.
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard/settings">
            <Settings className="size-4" aria-hidden="true" />
            Globalne postavke
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Aktivni alerti"
          value={activeAlerts.length}
          description={`${data.alerts.length} ukupno sacuvano`}
          iconName="Bell"
          iconColor="blue"
        />
        <StatCard
          title="Prosj. kvalitet"
          value={`${avgQuality}%`}
          description="Score iz quality_stats"
          iconName="Target"
          iconColor="green"
        />
        <StatCard
          title="Nova obavjestenja"
          value={unreadNotifications}
          description={`${data.notifications.length} u historiji`}
          iconName="BellRing"
          iconColor="amber"
        />
        <StatCard
          title="Pobjede iz alerta"
          value={winsFromAlerts}
          description="Ako je kvalitet povezan sa ishodima"
          iconName="Trophy"
          iconColor="purple"
        />
      </section>

      <AlertCreatorClient initialInput={latestParse?.input_text} initialParsed={latestParse?.parsed_query ?? null} />

      <section className="flex flex-wrap gap-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3 shadow-[var(--shadow-card)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button key={tab.key} asChild variant={activeTab === tab.key ? "default" : "outline"} size="sm">
              <Link href={`/dashboard/alerti?tab=${tab.key}`}>
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </Link>
            </Button>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={tabs.find((tab) => tab.key === activeTab)?.label ?? "Moji alerti"}>
          {activeTab === "pretrage" ? (
            <SavedSearches alerts={data.alerts} />
          ) : activeTab === "istorija" ? (
            <NotificationHistory notifications={data.notifications} />
          ) : activeTab === "postavke" ? (
            <PreferencesList preferences={data.preferences} />
          ) : (
            <AlertCards alerts={data.alerts} />
          )}
        </Panel>

        <aside className="space-y-4">
          <Panel title="Najefikasniji alerti" subtitle="Alerti koji su vodili do pobjeda ili visokog score-a">
            {data.efficientAlerts.length > 0 ? (
              <div className="space-y-3">
                {data.efficientAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{alert.name}</p>
                      <QualityBadge score={alert.qualityScore} />
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      {alert.matchedCount} poklapanja Â· {alert.winsCount} pobjeda
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Trophy className="size-7" aria-hidden="true" />} title="Nema ishoda" className="min-h-48" />
            )}
          </Panel>

          <Panel title="Predlozeni alerti" subtitle="Izvedeno iz profila firme">
            {data.suggestions.length > 0 ? (
              <div className="space-y-3">
                {data.suggestions.map((suggestion) => (
                  <div key={suggestion.title} className="rounded-[var(--radius-input)] border border-[var(--border-default)] p-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{suggestion.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{suggestion.description}</p>
                    <Badge variant="outline" className="mt-2">{suggestion.source}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Sparkles className="size-7" aria-hidden="true" />} title="Nema novih prijedloga" className="min-h-48" />
            )}
          </Panel>

          <AIInsightBox title="Kvalitet alerta" variant="suggestion">
            <p>
              Kvalitet je najbolji kada alert ima CPV, lokaciju ili vrijednosni prag. Alerti bez preciznih uslova mogu slati previse slabih poklapanja.
            </p>
          </AIInsightBox>
        </aside>
      </section>
    </div>
  );
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

function AlertCards({ alerts }: { alerts: AlertCard[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-7" aria-hidden="true" />}
        title="Nema sacuvanih alerta"
        description="Kreirajte prvi alert kroz prirodni jezik ili sacuvanu pretragu."
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {alerts.map((alert) => (
        <article key={alert.id} className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{alert.name}</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {alert.frequency} Â· kreiran {formatDateBs(alert.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <QualityBadge score={alert.qualityScore} />
              <Badge variant={alert.enabled ? "default" : "outline"}>{alert.enabled ? "Aktivan" : "Pauziran"}</Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...alert.cpvCodes, ...alert.keywords, ...alert.authorities].slice(0, 8).map((token) => (
              <Badge key={token} variant="outline" className="bg-[var(--surface-2)]">
                {token}
              </Badge>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-[var(--radius-input)] bg-[var(--surface-2)] p-3 text-center text-xs">
            <Metric label="Poklapanja" value={alert.matchedCount} />
            <Metric label="Pobjede" value={alert.winsCount} />
            <Metric label="Zadnji hit" value={alert.lastTriggeredAt ? formatDateBs(alert.lastTriggeredAt) : "-"} />
          </div>
        </article>
      ))}
    </div>
  );
}

function SavedSearches({ alerts }: { alerts: AlertCard[] }) {
  const searchable = alerts.filter((alert) => alert.keywords.length > 0 || alert.cpvCodes.length > 0 || alert.authorities.length > 0);
  if (searchable.length === 0) {
    return <EmptyState icon={<Search className="size-7" aria-hidden="true" />} title="Nema sacuvanih pretraga" />;
  }

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {searchable.map((alert) => (
        <div key={alert.id} className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.name}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {[...alert.cpvCodes, ...alert.keywords, ...alert.authorities].join(" Â· ") || "Bez strukturiranih uslova"}
              </p>
            </div>
            <QualityBadge score={alert.qualityScore} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationHistory({ notifications }: { notifications: Array<{ id: string; subject: string; body_text: string | null; created_at: string; read_at: string | null }> }) {
  if (notifications.length === 0) {
    return <EmptyState icon={<History className="size-7" aria-hidden="true" />} title="Nema obavjestenja" />;
  }

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {notifications.map((notification) => (
        <div key={notification.id} className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{notification.subject}</p>
              {notification.body_text ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{notification.body_text}</p> : null}
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">{formatDateBs(notification.created_at)}</p>
            </div>
            <Badge variant={notification.read_at ? "outline" : "default"}>{notification.read_at ? "Procitano" : "Novo"}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreferencesList({ preferences }: { preferences: Array<{ event_type: string; channel: string; enabled: boolean; updated_at: string }> }) {
  if (preferences.length === 0) {
    return <EmptyState icon={<Settings className="size-7" aria-hidden="true" />} title="Nema podesavanja" description="Preference obavjestenja nisu jos unesene." />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {preferences.map((preference) => (
        <div key={`${preference.event_type}-${preference.channel}`} className="rounded-[var(--radius-input)] border border-[var(--border-default)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{preference.event_type.replace(/_/g, " ")}</p>
            <Badge variant={preference.enabled ? "default" : "outline"}>{preference.enabled ? "Ukljuceno" : "Iskljuceno"}</Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{preference.channel} Â· {formatDateBs(preference.updated_at)}</p>
        </div>
      ))}
    </div>
  );
}

function QualityBadge({ score }: { score: number }) {
  const className =
    score >= 80
      ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-strong)]"
      : score >= 55
        ? "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning-strong)]"
        : "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-strong)]";

  return (
    <span className={cn("rounded-full border px-2 py-1 text-xs font-semibold", className)}>
      {score}%
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-[var(--text-tertiary)]">{label}</p>
    </div>
  );
}
