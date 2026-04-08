"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Play, RefreshCw, ServerCog, ShieldAlert, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminSystemData } from "@/lib/admin-operator";
import { cn } from "@/lib/utils";

interface AdminSystemShellProps {
  data: AdminSystemData;
}

interface SyncRunResult {
  status: string;
  duration_ms?: number;
  total_added?: number;
  total_updated?: number;
  error?: string;
}

interface MaintenanceRunResult {
  status: string;
  duration_ms?: number;
  total_updated?: number;
  error?: string;
}

interface ManualJobRunResult {
  endpoint: string;
  status: string;
  duration_ms?: number;
  added?: number;
  updated?: number;
  error?: string;
}

function isManualJobRunResult(value: unknown): value is ManualJobRunResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.endpoint === "string" &&
    typeof candidate.status === "string"
  );
}

function normalizeSyncErrorMessage(message: string): string {
  if (/timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(message)) {
    return "Portal sync je trajao predugo i server ga je prekinuo. Pokusaj ponovo za nekoliko minuta. Ako se problem ponavlja, otvori server log i provjeri koji korak usporava prolaz.";
  }

  if (/deployment/i.test(message)) {
    return "Portal sync trenutno nije vracen iz server okruzenja kako treba. Pokusaj ponovo, a ako se isto ponovi provjeri deployment log.";
  }

  return message;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getJobTone(status: string): string {
  switch (status) {
    case "U redu":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Treba paznju":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof ServerCog;
}) {
  return (
    <Card className="border-slate-200/80 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.28)]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</CardDescription>
          <CardTitle className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</CardTitle>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function AdminSystemShell({ data }: AdminSystemShellProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SyncRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobRuns, setJobRuns] = useState<Record<string, {
    running: boolean;
    result: ManualJobRunResult | null;
    error: string | null;
  }>>({});
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<MaintenanceRunResult | null>(null);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  const isAnyJobRunning = Object.values(jobRuns).some((state) => state.running);

  async function handleRunSync() {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/system/run-sync", { method: "POST" });
      const raw = await response.text();
      const payload = raw.trim().startsWith("{") ? (JSON.parse(raw) as SyncRunResult) : null;

      if (!response.ok) {
        throw new Error(normalizeSyncErrorMessage(payload?.error ?? (raw.trim() || "Ne mogu pokrenuti sync.")));
      }

      if (!payload) {
        throw new Error("Sync je vratio neispravan odgovor. Otvori server log i provjeri backend gresku.");
      }

      setResult(payload);
      router.refresh();
    } catch (syncError) {
      setError(syncError instanceof Error ? normalizeSyncErrorMessage(syncError.message) : "Greska pri pokretanju synca.");
    } finally {
      setRunning(false);
    }
  }

  async function handleRunMaintenance() {
    setMaintenanceRunning(true);
    setMaintenanceResult(null);
    setMaintenanceError(null);

    try {
      const response = await fetch("/api/admin/system/run-maintenance", { method: "POST" });
      const raw = await response.text();
      const payload = raw.trim().startsWith("{") ? (JSON.parse(raw) as MaintenanceRunResult) : null;

      if (!response.ok) {
        throw new Error(payload?.error ?? (raw.trim() || "Ne mogu pokrenuti maintenance."));
      }

      if (!payload) {
        throw new Error("Maintenance je vratio neispravan odgovor.");
      }

      setMaintenanceResult(payload);
      router.refresh();
    } catch (maintenanceRunError) {
      setMaintenanceError(
        maintenanceRunError instanceof Error
          ? maintenanceRunError.message
          : "Greska pri pokretanju maintenancea."
      );
    } finally {
      setMaintenanceRunning(false);
    }
  }

  async function handleRunJob(endpoint: string) {
    setJobRuns((current) => ({
      ...current,
      [endpoint]: {
        running: true,
        result: null,
        error: null,
      },
    }));

    try {
      const response = await fetch("/api/admin/system/run-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      const raw = await response.text();
      const payload = raw.trim().startsWith("{") ? (JSON.parse(raw) as unknown) : null;

      if (!response.ok) {
        const payloadError =
          payload && typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : null;
        const fallbackError = raw.trim() || "Ne mogu pokrenuti sync job.";

        throw new Error(normalizeSyncErrorMessage(payloadError ?? fallbackError));
      }

      if (!isManualJobRunResult(payload)) {
        throw new Error("Sync job je vratio neispravan odgovor. Otvori server log i provjeri backend gresku.");
      }

      setJobRuns((current) => ({
        ...current,
        [endpoint]: {
          running: false,
          result: payload,
          error: null,
        },
      }));
      router.refresh();
    } catch (jobError) {
      setJobRuns((current) => ({
        ...current,
        [endpoint]: {
          running: false,
          result: null,
          error: jobError instanceof Error ? normalizeSyncErrorMessage(jobError.message) : "Greska pri pokretanju sync joba.",
        },
      }));
    }
  }

  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(14,31,60,0.98)_50%,rgba(17,49,89,0.94)_100%)] p-8 text-white shadow-[0_45px_90px_-45px_rgba(2,6,23,0.88)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              System
            </Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Tehnicki pregled sync sistema
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Ovdje vidis koji dio portala se puni podacima, kada je zadnji put prosao, koliko je stavki dodano ili azurirano i gdje treba reakcija.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Zadnji zabiljezeni sync</p>
            <p className="mt-2 font-semibold text-white">{formatDateTime(data.summary.lastSyncAt)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Jobovi uredni" value={String(data.summary.healthyJobs)} hint="Broj sync jobova koji trenutno djeluju svjeze." icon={CheckCircle2} />
        <SummaryCard title="Treba paznju" value={String(data.summary.attentionJobs)} hint="Jobovi sa zastarjelim, ali postojecim prolazom." icon={AlertTriangle} />
        <SummaryCard title="Bez loga" value={String(data.summary.failedJobs)} hint="Jobovi za koje sistem nema nijedan zabiljezen prolaz." icon={ShieldAlert} />
        <SummaryCard title="Ukupno jobova" value={String(data.jobs.length)} hint="Kompletna operativna lista sync procesa koji pune podatke u aplikaciju." icon={ServerCog} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-semibold">U redu</p>
            <p className="mt-1">Job ima svjez log i ne trazi intervenciju.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Treba paznju</p>
            <p className="mt-1">Job jeste radio, ali zadnji prolaz vise nije dovoljno svjez.</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">Bez loga</p>
            <p className="mt-1">Za ovaj job trenutno nema nijednog zabiljezenog prolaza u `sync_log`.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Play className="size-4 text-blue-700" />
              <CardTitle className="text-slate-950">Akcije</CardTitle>
            </div>
            <CardDescription>Rucno pokretanje synca i maintenance sweepa za portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={handleRunSync} disabled={running || maintenanceRunning || isAnyJobRunning}>
                {running ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
                {running ? "Pokrece se sync..." : "Pokreni portal sync"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRunMaintenance}
                disabled={running || maintenanceRunning || isAnyJobRunning}
              >
                {maintenanceRunning ? <RefreshCw className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                {maintenanceRunning ? "Pokrece se maintenance..." : "Pokreni maintenance"}
              </Button>
            </div>

            {result ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold">Sync zavrsen: {result.status === "partial" ? "zavrsen uz upozorenja" : "uspjesno"}</p>
                <p className="mt-1">Dodano: {result.total_added ?? 0} · Azurirano: {result.total_updated ?? 0}</p>
                <p className="mt-1">Trajanje: {result.duration_ms ? `${Math.round(result.duration_ms / 1000)}s` : "nije dostupno"}</p>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {maintenanceResult ? (
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm",
                  maintenanceResult.status === "partial"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                )}
              >
                <p className="font-semibold">Maintenance zavrsen: {maintenanceResult.status === "partial" ? "uz upozorenja" : "uspjesno"}</p>
                <p className="mt-1">Dopunjeno / osvjezeno: {maintenanceResult.total_updated ?? 0}</p>
                <p className="mt-1">Trajanje: {maintenanceResult.duration_ms ? `${Math.round(maintenanceResult.duration_ms / 1000)}s` : "nije dostupno"}</p>
              </div>
            ) : null}

            {maintenanceError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {maintenanceError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              Ova akcija pokrece operativni prolaz koji osvjezava tendere, ugovorne organe, dobavljace, dodjele i planirane nabavke, a zatim radi manji maintenance sweep za kljucne praznine. Koristi je kada nesto kasni ili kada zelis odmah osvjeziti stanje portala bez cekanja nocnog ciklusa.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              Maintenance mozes pokrenuti zasebno kada zelis samo geo enrichment i dopunu praznina bez kompletnog portal sync prolaza.
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Stvari koje traze paznju</CardTitle>
            <CardDescription>Ovdje su samo oni sync procesi koji kasne ili uopste nemaju log.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.issues.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  Trenutno nema zabiljezenih tehnickih stvari koje traze intervenciju.
                </div>
              ) : (
                data.issues.map((issue) => (
                  <div key={issue.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">{issue.title}</p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                          issue.tone === "danger"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        )}
                      >
                        {issue.tone === "danger" ? "hitno" : "paznja"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{issue.description}</p>
                    <p className="mt-2 text-xs text-slate-500">Zadnji trag: {formatDateTime(issue.occurredAt)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Svi sync jobovi</h2>
          <p className="mt-1 text-sm text-slate-600">Svaka kartica objasnjava sta taj job radi, kada je zadnji put prosao i koliko je podataka obradio.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          {data.jobs.map((job) => {
            const jobState = jobRuns[job.endpoint];

            return (
              <Card key={job.endpoint} className="border-slate-200/80 bg-white shadow-[0_20px_40px_-34px_rgba(15,23,42,0.26)]">
                <CardHeader className="space-y-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base text-slate-950">{job.label}</CardTitle>
                      <CardDescription className="mt-1">Zadnji prolaz: {formatDateTime(job.lastRun)}</CardDescription>
                    </div>
                    <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", getJobTone(job.status))}>
                      {job.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm leading-6 text-slate-600">
                    <p>{job.purpose}</p>
                    <p>{job.plainMessage}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Dodano</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{job.recordsAdded}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Azurirano</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{job.recordsUpdated}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    {job.durationLabel}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRunJob(job.endpoint)}
                    disabled={running || isAnyJobRunning}
                    className="w-full rounded-2xl border-slate-200"
                  >
                    {jobState?.running ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
                    {jobState?.running ? "Pokrece se job..." : "Pokreni ovaj sync"}
                  </Button>
                  {jobState?.result ? (
                    <div
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm",
                        jobState.result.status === "partial"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      )}
                    >
                      <p className="font-semibold">
                        {jobState.result.status === "partial" ? "Job zavrsen uz upozorenja" : "Job zavrsen uspjesno"}
                      </p>
                      <p className="mt-1">
                        Dodano: {jobState.result.added ?? 0} · Azurirano: {jobState.result.updated ?? 0}
                      </p>
                      <p className="mt-1">
                        Trajanje: {jobState.result.duration_ms ? `${Math.round(jobState.result.duration_ms / 1000)}s` : "nije dostupno"}
                      </p>
                      {jobState.result.error ? <p className="mt-1">{jobState.result.error}</p> : null}
                    </div>
                  ) : null}
                  {jobState?.error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                      {jobState.error}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
