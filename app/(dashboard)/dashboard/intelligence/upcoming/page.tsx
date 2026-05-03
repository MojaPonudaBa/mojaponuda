import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  Filter,
  Search,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import {
  cpvLabel,
  formatDateBs,
  formatKm,
  getUpcomingDashboardData,
  type PlannedProcurementItem,
} from "@/lib/dashboard-c2";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    cpv?: string;
    organ?: string;
    year?: string;
    type?: string;
    min?: string;
    max?: string;
    history?: string;
  }>;
};

export default async function UpcomingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const params = searchParams ? await searchParams : {};
  const data = await getUpcomingDashboardData(supabase, {
    search: params.q,
    cpv: params.cpv,
    organ: params.organ,
    year: params.year,
    type: params.type,
    minValue: parseNumberParam(params.min),
    maxValue: parseNumberParam(params.max),
  });
  const expandedId = params.history ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            <CalendarClock className="size-3.5 text-[var(--primary)]" aria-hidden="true" />
            Planirane nabavke i rani signal
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Rano upozorenje</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Pratite planirane nabavke prije objave tendera i pripremite dokumente, tim i kapacitete na vrijeme.
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard/intelligence">
            <TrendingUp className="size-4" aria-hidden="true" />
            Intelligence pregled
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Planirane nabavke" value={data.totalCount} description="U trenutnom filteru" iconName="CalendarClock" iconColor="blue" />
        <StatCard title="Ukupna vrijednost" value={formatKm(data.totalValue)} description={`${data.knownValueCount} sa poznatom vrijednoscu`} iconName="WalletCards" iconColor="green" />
        <StatCard title="Sljedecih 30 dana" value={data.next30Count} description="Planirani datumi uskoro" iconName="TrendingUp" iconColor="amber" />
        <StatCard title="Pracenje stavki" value={data.trackingSupported ? "Aktivno" : "N/A"} description="Tabela za pracenje stavki nije u shemi" iconName="Building2" iconColor="purple" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <FilterBar params={params} />
          <Panel title="Planirane nabavke" subtitle={`${data.items.length} prikazanih stavki`}>
            {data.items.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="size-7" aria-hidden="true" />}
                title="Nema planiranih nabavki"
                description="Promijenite filtere ili pretragu za siri prikaz."
              />
            ) : (
              <div className="space-y-3">
                {data.items.map((item) => (
                  <UpcomingCard key={item.id} item={item} expanded={expandedId === item.id} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Filteri" subtitle="CPV, organ, godina i vrijednost">
            <form className="space-y-3">
              <FilterSelect name="cpv" label="CPV" value={params.cpv} options={data.filters.cpvCodes.map((code) => ({ value: code, label: cpvLabel(code) }))} />
              <FilterSelect name="organ" label="Organ" value={params.organ} options={data.filters.authorities.map((name) => ({ value: name, label: name }))} />
              <FilterSelect name="year" label="Godina" value={params.year} options={data.filters.years.map((year) => ({ value: year, label: year }))} />
              <FilterSelect name="type" label="Tip" value={params.type} options={data.filters.types.map((type) => ({ value: type, label: type }))} />
              <div className="grid grid-cols-2 gap-2">
                <NumberInput name="min" label="Min KM" value={params.min} />
                <NumberInput name="max" label="Max KM" value={params.max} />
              </div>
              <input type="hidden" name="q" value={params.q ?? ""} />
              <Button type="submit" className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
                <Filter className="size-4" aria-hidden="true" />
                Primijeni filtere
              </Button>
            </form>
          </Panel>

          <Panel title="Napomena o pracenju">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Specificno pracenje planirane nabavke ceka tabelu user_tracked_planned_procurements. Do tada se prikazuju javni planovi i historija narucioca bez mutacija.
            </p>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function parseNumberParam(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function FilterBar({ params }: { params: Awaited<PageProps["searchParams"]> extends infer T ? T : Record<string, string | undefined> }) {
  return (
    <form className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2">
        <Search className="size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
        <input
          name="q"
          defaultValue={params?.q ?? ""}
          placeholder="Pretraga po opisu, CPV ili naruciocu"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        />
      </div>
      <input type="hidden" name="cpv" value={params?.cpv ?? ""} />
      <input type="hidden" name="organ" value={params?.organ ?? ""} />
      <input type="hidden" name="year" value={params?.year ?? ""} />
      <input type="hidden" name="type" value={params?.type ?? ""} />
      <input type="hidden" name="min" value={params?.min ?? ""} />
      <input type="hidden" name="max" value={params?.max ?? ""} />
      <Button type="submit" className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
        <Search className="size-4" aria-hidden="true" />
        Trazi
      </Button>
    </form>
  );
}

function UpcomingCard({ item, expanded }: { item: PlannedProcurementItem; expanded: boolean }) {
  const authority = item.contracting_authorities;
  const historyHref = expanded
    ? "/dashboard/intelligence/upcoming"
    : `/dashboard/intelligence/upcoming?history=${item.id}`;

  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link href={`/dashboard/intelligence/upcoming/${item.id}`} className="line-clamp-2 text-base font-semibold text-[var(--text-primary)] hover:text-[var(--primary)]">
            {item.description ?? "Planirana nabavka bez opisa"}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5" aria-hidden="true" />
              {authority?.name ?? "Nepoznat organ"}
            </span>
            <span>{item.cpv_code ? cpvLabel(item.cpv_code) : "CPV nije naveden"}</span>
            {item.contract_type ? <span>{item.contract_type}</span> : null}
          </div>
        </div>
        <div className="grid gap-2 text-sm lg:min-w-52 lg:text-right">
          <span className="font-semibold text-[var(--primary)]">{formatKm(item.estimated_value)}</span>
          <span className="text-[var(--text-secondary)]">Planirano: {formatDateBs(item.planned_date)}</span>
          <Button type="button" variant="outline" disabled>
            Prati
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={historyHref}>
            <ChevronDown className="size-4" aria-hidden="true" />
            Historija
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/intelligence/upcoming/${item.id}`}>Detalji</Link>
        </Button>
      </div>

      {expanded ? (
        <div className="mt-4 rounded-[var(--radius-input)] bg-[var(--surface-2)] p-3">
          {item.history.length > 0 ? (
            <div className="space-y-2">
              {item.history.slice(0, 4).map((award) => (
                <div key={award.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--text-primary)]">{award.winner_name ?? "Nepoznat pobjednik"}</span>
                  <span className="shrink-0 font-semibold text-[var(--text-secondary)]">{formatKm(award.winning_price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Nema historije dodjela za ovog narucioca u dostupnom uzorku.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="w-full rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
      >
        <option value="">Svi</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberInput({ name, label, value }: { name: string; label: string; value?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
      <input
        name={name}
        defaultValue={value ?? ""}
        inputMode="numeric"
        className="w-full rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
      />
    </label>
  );
}
