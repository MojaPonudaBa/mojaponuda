import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileCheck2,
  History,
} from "lucide-react";

import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { ProGate } from "@/components/subscription/pro-gate";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  cpvLabel,
  formatDateBs,
  formatKm,
  getUpcomingDetailData,
} from "@/lib/dashboard-c2";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UpcomingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const data = await getUpcomingDetailData(supabase, id);
  if (!data) notFound();

  const item = data.item;
  const authority = item.contracting_authorities;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/intelligence/upcoming">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Nazad na rano upozorenje
          </Link>
        </Button>
      </div>

      <header className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              <CalendarClock className="size-3.5 text-[var(--primary)]" aria-hidden="true" />
              Planirana nabavka
            </div>
            <h1 className="max-w-4xl text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {item.description ?? "Planirana nabavka bez opisa"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>{authority?.name ?? "Nepoznat organ"}</span>
              <span>{item.cpv_code ? cpvLabel(item.cpv_code) : "CPV nije naveden"}</span>
              {item.contract_type ? <span>{item.contract_type}</span> : null}
            </div>
          </div>
          <Button type="button" variant="outline" disabled>
            Prati
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Vrijednost" value={formatKm(item.estimated_value)} description="Procijenjena vrijednost" iconName="WalletCards" iconColor="green" />
        <StatCard title="Planirani datum" value={formatDateBs(item.planned_date)} description="Iz plana nabavki" iconName="CalendarClock" iconColor="blue" />
        <StatCard title="Historija organa" value={data.pastAwards.length} description="Poznate dodjele u uzorku" iconName="History" iconColor="purple" />
        <StatCard title="CPV" value={item.cpv_code ?? "N/A"} description={item.cpv_code ? cpvLabel(item.cpv_code) : "Nije navedeno"} iconName="Target" iconColor="cyan" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Panel title="Detalji stavke">
            <dl className="grid gap-4 md:grid-cols-2">
              <Detail label="Portal ID" value={item.portal_id} />
              <Detail label="Tip ugovora" value={item.contract_type ?? "Nije navedeno"} />
              <Detail label="CPV" value={item.cpv_code ? cpvLabel(item.cpv_code) : "Nije navedeno"} />
              <Detail label="Planirani datum" value={formatDateBs(item.planned_date)} />
              <Detail label="Procijenjena vrijednost" value={formatKm(item.estimated_value)} />
              <Detail label="Kreirano u sistemu" value={formatDateBs(item.created_at)} />
            </dl>
          </Panel>

          <Panel title="Prosli slicni tenderi ovog organa" subtitle={authority?.name}>
            {data.pastAwards.length > 0 ? (
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                    <tr>
                      <th className="px-4 py-3 text-left">Datum</th>
                      <th className="px-4 py-3 text-left">Pobjednik</th>
                      <th className="px-4 py-3 text-right">Vrijednost</th>
                      <th className="px-4 py-3 text-right">Ponudjaci</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {data.pastAwards.slice(0, 12).map((award) => (
                      <tr key={award.id}>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDateBs(award.award_date)}</td>
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{award.winner_name ?? "Nepoznat pobjednik"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">{formatKm(award.winning_price)}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{award.total_bidders_count ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={<History className="size-7" aria-hidden="true" />} title="Nema historije" description="Za ovog narucioca nema dovoljno poznatih odluka u uzorku." />
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Narucilac">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[var(--primary-soft)] text-[var(--primary-strong)]">
                  <Building2 className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{authority?.name ?? "Nepoznat organ"}</p>
                  <p className="text-[var(--text-secondary)]">JIB: {authority?.jib ?? "Nije navedeno"}</p>
                  <p className="text-[var(--text-secondary)]">{[authority?.city, authority?.municipality, authority?.canton].filter(Boolean).join(", ") || "Lokacija nije navedena"}</p>
                </div>
              </div>
            </div>
          </Panel>

          <AIInsightBox title="Predvidjeni prozor objave" variant="default">
            <p>
              <strong>{data.predictedWindow.label}</strong>
            </p>
            <p className="mt-1">{data.predictedWindow.detail}</p>
          </AIInsightBox>

          <Panel title="Predvidjeni dokumenti" subtitle="Heuristika po CPV grupi">
            <div className="space-y-2">
              {data.predictedDocuments.map((document) => (
                <div key={document} className="flex items-center gap-2 rounded-[var(--radius-input)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]">
                  <FileCheck2 className="size-4 text-[var(--success-strong)]" aria-hidden="true" />
                  {document}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Pracenje">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Specificno pracenje planiranih nabavki ceka tabelu user_tracked_planned_procurements, pa ovaj ekran za sada ne upisuje nove redove.
            </p>
          </Panel>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
