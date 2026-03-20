import { Activity, AlertTriangle, ArrowUpRight, Building2, CreditCard, Database, Gauge, HardDrive, RefreshCcw, ShieldCheck, Target, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDashboardData, AdminDashboardRow, AdminSyncStatusItem } from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

interface AdminDashboardOverviewProps {
  data: AdminDashboardData;
  adminEmail: string;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("bs-BA", {
    style: "currency",
    currency: "BAM",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatCompactCurrency(value: number | null | undefined): string {
  const amount = Number(value) || 0;

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M KM`;
  }

  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K KM`;
  }

  return `${Math.round(amount)} KM`;
}

function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

function getSubscriptionTone(status: string): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "past_due":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getFreshnessTone(freshness: AdminSyncStatusItem["freshness"]): string {
  switch (freshness) {
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "stale":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getOnboardingTone(status: string): string {
  switch (status) {
    case "Završen":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "U toku":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getCommercialTone(signal: string): string {
  if (signal.includes("Kandidat") || signal.includes("Spreman")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (signal.includes("riziku") || signal.includes("Zastoj")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (signal.includes("Niska") || signal.includes("Bez")) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function StatCard({
  title,
  value,
  meta,
  icon: Icon,
}: {
  title: string;
  value: string;
  meta: string;
  icon: typeof Users;
}) {
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.22)]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</CardTitle>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{meta}</p>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SyncStatusCard({ item }: { item: AdminSyncStatusItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_35px_-32px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.endpoint}</p>
          <p className="mt-1 text-xs text-slate-500">Zadnji prolaz: {formatDateTime(item.ranAt)}</p>
        </div>
        <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getFreshnessTone(item.freshness))}>
          {item.freshness === "healthy"
            ? "Svježe"
            : item.freshness === "warning"
              ? "Provjeriti"
              : item.freshness === "stale"
                ? "Zastario"
                : "Nema podatka"}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Dodano</p>
          <p className="mt-1 font-semibold text-slate-900">{item.recordsAdded}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ažurirano</p>
          <p className="mt-1 font-semibold text-slate-900">{item.recordsUpdated}</p>
        </div>
      </div>
    </div>
  );
}

function AccountsTable({ rows }: { rows: AdminDashboardRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <th className="px-4 py-3 font-semibold">Korisnik</th>
            <th className="px-4 py-3 font-semibold">Firma</th>
            <th className="px-4 py-3 font-semibold">Plan</th>
            <th className="px-4 py-3 font-semibold">Onboarding</th>
            <th className="px-4 py-3 font-semibold">Aktivnost</th>
            <th className="px-4 py-3 font-semibold">Komercijalni signal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.userId} className="align-top">
              <td className="px-4 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{row.email}</p>
                  <p className="mt-1 text-xs text-slate-500">Registrovan: {formatDateTime(row.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">Zadnji sign-in: {formatDateTime(row.lastSignInAt)}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div>
                  <p className="font-medium text-slate-900">{row.companyName ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.primaryIndustryLabel ?? "Profil nije preciziran"}</p>
                  <p className="mt-1 text-xs text-slate-500">Regije: {row.regionsLabel}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">{row.planName}</p>
                  <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getSubscriptionTone(row.subscriptionStatus))}>
                    {row.subscriptionStatus}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-4">
                <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getOnboardingTone(row.onboardingStatus))}>
                  {row.onboardingStatus}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1 text-xs text-slate-600">
                  <p>{row.documentsCount} dok.</p>
                  <p>{row.activeBids} aktivnih ponuda</p>
                  <p>{formatStorage(row.storageBytes)}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getCommercialTone(row.commercialSignal))}>
                  {row.commercialSignal}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDashboardOverview({ data, adminEmail }: AdminDashboardOverviewProps) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(10,26,56,0.98)_55%,rgba(17,44,91,0.96)_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(2,6,23,0.88)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl space-y-4">
            <Badge variant="outline" className="border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              Admin komandni centar
            </Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Pregled poslovnog zdravlja platforme MojaPonuda.ba
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Jedan pogled na rast korisnika, pretplate, procijenjeni MRR, aktivaciju računa, korištenje proizvoda i zdravlje sync/data sloja. Ovo je interna poslovna konzola za odlučivanje šta prodajno, operativno i produktno treba uraditi sljedeće.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Admin račun</p>
              <p className="mt-2 text-sm font-semibold text-white">{adminEmail}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Generisano</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(data.generatedAt)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Ukupno korisnika" value={String(data.summary.totalUsers)} meta={`${data.summary.newUsers30d} novih u zadnjih 30 dana`} icon={Users} />
        <StatCard title="Aktivne pretplate" value={String(data.summary.activeSubscriptions)} meta={`${data.summary.pastDueSubscriptions} past due računa`} icon={CreditCard} />
        <StatCard title="Procijenjeni MRR" value={formatCompactCurrency(data.summary.estimatedActiveMrr)} meta={`${formatCompactCurrency(data.summary.estimatedAtRiskMrr)} u riziku naplate`} icon={TrendingUp} />
        <StatCard title="Aktivne ponude" value={String(data.summary.activeBids)} meta={`${data.summary.openTenders} otvorenih tendera na tržištu`} icon={Target} />
        <StatCard title="Kompanije" value={String(data.summary.companiesCount)} meta={`${data.summary.completedProfiles} završenih profila`} icon={Building2} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950"><Gauge className="size-4 text-blue-700" /> SaaS funnel</CardTitle>
              <CardDescription>Registracija, aktivacija i komercijalna konverzija.</CardDescription>
            </CardHeader>
            <CardContent>
              <MetricRow label="Sign-in u zadnjih 7 dana" value={`${data.funnel.signedInLast7Days}`} hint="Signal stvarnog povratka u proizvod" />
              <MetricRow label="Stopa otvaranja firme" value={`${data.funnel.companySetupRate}%`} hint="Koliko registrovanih korisnika dođe do company setup-a" />
              <MetricRow label="Stopa završenog onboardinga" value={`${data.funnel.profileCompletionRate}%`} hint="Koliko firmi je zaista profilisano za preporuke" />
              <MetricRow label="Paying conversion" value={`${data.funnel.payingConversionRate}%`} hint="Aktivne i past_due pretplate naspram ukupnih korisnika" />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950"><TrendingUp className="size-4 text-blue-700" /> Prihod i naplata</CardTitle>
              <CardDescription>Procjena bazirana na aktivnim planovima dok ne uvedemo order history.</CardDescription>
            </CardHeader>
            <CardContent>
              <MetricRow label="Procijenjeni MRR" value={formatCurrency(data.revenue.estimatedActiveMrr)} hint="Aktivne pretplate mapirane na plan cijene" />
              <MetricRow label="Projicirani ARR" value={formatCurrency(data.revenue.projectedArr)} hint="MRR × 12" />
              <MetricRow label="MRR u riziku" value={formatCurrency(data.revenue.estimatedAtRiskMrr)} hint="Past due računi koji traže follow-up" />
              <MetricRow label="Obnove u narednih 30 dana" value={`${data.revenue.renewalsNext30d}`} hint="Za retention i billing pažnju" />
              <MetricRow label="Novi paying u 30 dana" value={`${data.revenue.newPaying30d}`} hint="Svježe aktivirane pretplate" />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950"><ArrowUpRight className="size-4 text-blue-700" /> Komercijalni signali</CardTitle>
              <CardDescription>Računi koje vrijedi kontaktirati ili pogurati.</CardDescription>
            </CardHeader>
            <CardContent>
              <MetricRow label="Upgrade kandidati" value={`${data.businessSignals.upgradeCandidates}`} hint="Basic ili Pro računi koji već izlaze iz okvira plana" />
              <MetricRow label="Reaktivacioni targeti" value={`${data.businessSignals.reactivationTargets}`} hint="Bez aktivne pretplate, ali sa signalom korištenja" />
              <MetricRow label="Zastoji u onboardingu" value={`${data.businessSignals.onboardingStalls}`} hint="Noviji računi koji su zapeli prije potpunog profila" />
              <MetricRow label="High-intent računi" value={`${data.businessSignals.highIntentAccounts}`} hint="Imaju dokumente ili aktivne bid workspaces" />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950"><ShieldCheck className="size-4 text-blue-700" /> Planovi i segmenti</CardTitle>
              <CardDescription>Ko plaća, na kojem planu i iz kojih djelatnosti dolazi potražnja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                {data.planDistribution.map((plan) => (
                  <div key={plan.planId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{plan.planName}</p>
                        <p className="mt-1 text-xs text-slate-500">{plan.activeCount} aktivnih · {plan.pastDueCount} past due</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatCompactCurrency(plan.estimatedMrr)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Najčešće industrije</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.topIndustries.map((item) => (
                    <Badge key={item.label} variant="outline" className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                      {item.label} · {item.companies}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950"><Database className="size-4 text-blue-700" /> Operativno zdravlje</CardTitle>
            <CardDescription>Stanje sadržaja, tržišnih podataka i noćnog maintenance-a.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Dokumenti</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.totalDocuments}</p>
                <p className="mt-1 text-sm text-slate-600">{formatStorage(data.operations.totalStorageBytes)} ukupno</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Otvoreni tenderi</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.openTenders}</p>
                <p className="mt-1 text-sm text-slate-600">{formatCompactCurrency(data.operations.openTenderValue)} procijenjene vrijednosti</p>
              </div>
            </div>

            <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <MetricRow label="Dokumenti pred istekom 30 dana" value={`${data.operations.expiringDocuments30d}`} />
              <MetricRow label="Ukupno bid workspace-a" value={`${data.operations.totalBids}`} />
              <MetricRow label="Predanih ponuda" value={`${data.operations.submittedBids}`} />
              <MetricRow label="Dobijenih / izgubljenih" value={`${data.operations.wonBids} / ${data.operations.lostBids}`} hint={data.operations.winRate !== null ? `Win rate ${data.operations.winRate}%` : "Još nema zatvorenih ishoda"} />
              <MetricRow label="Tenderi bez area_label" value={`${data.operations.missingTenderAreas}`} />
              <MetricRow label="Naručioci bez geo podataka" value={`${data.operations.authoritiesMissingGeo}`} />
              <MetricRow label="Planirane nabavke 90 dana" value={`${data.operations.plannedProcurements90d}`} hint={`${formatCompactCurrency(data.operations.plannedValue90d)} pipeline vrijednosti`} />
              <MetricRow label="Dodjele u 30 dana" value={`${data.operations.awards30d}`} hint={data.operations.averageBidders30d !== null ? `Prosjek ${data.operations.averageBidders30d} ponuđača` : "Bez pouzdanog bidder prosjeka"} />
              <MetricRow label="Realizovana tržišna vrijednost 30 dana" value={formatCompactCurrency(data.operations.realizedMarketValue30d)} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <RefreshCcw className="size-4 text-blue-700" />
          <h2 className="text-lg font-semibold text-slate-950">Zdravlje sync i maintenance sloja</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.operations.syncStatuses.map((item) => (
            <SyncStatusCard key={item.endpoint} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950"><Users className="size-4 text-blue-700" /> Novi i nedavni korisnici</CardTitle>
            <CardDescription>Brzi pregled svježih registracija, statusa onboardinga i prvih komercijalnih signala.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <AccountsTable rows={data.recentUsers} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950"><Activity className="size-4 text-blue-700" /> Najaktivniji računi</CardTitle>
            <CardDescription>Firme sa najviše dokumenata, bid aktivnosti i najboljim signalom za prodajni ili success follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <AccountsTable rows={data.portfolioAccounts} />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950"><AlertTriangle className="size-4 text-blue-700" /> Šta dalje dodati u admin panel</CardTitle>
            <CardDescription>Plan modula koji imaju direktan poslovni smisao za MojaPonuda.ba.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {data.roadmap.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        item.priority === "high"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      {item.priority === "high" ? "Visok prioritet" : "Srednji prioritet"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <HardDrive className="size-3.5" />
                    {item.phase}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
