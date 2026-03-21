"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Play, RefreshCw, ServerCog, ShieldAlert } from "lucide-react";
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getJobTone(status: string): string {
  switch (status) {
    case "U redu":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Treba pažnju":
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
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SyncRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRunSync() {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/system/run-sync", { method: "POST" });
      const payload = (await response.json()) as SyncRunResult;

      if (!response.ok) {
        throw new Error(payload.error ?? "Ne mogu pokrenuti sync.");
      }

      setResult(payload);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Greška pri pokretanju synca.");
    } finally {
      setRunning(false);
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
                Tehnički pregled koji odmah kaže šta je u redu, a šta nije
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Zadržan je cijeli jutarnji sync blok, ali bez nejasnog jezika. Ovdje vidiš koji job je prošao, šta je dodano, šta je ažurirano i gdje trebaš reagovati.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Zadnji zabilježeni sync</p>
            <p className="mt-2 font-semibold text-white">{formatDateTime(data.summary.lastSyncAt)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Jobovi uredni" value={String(data.summary.healthyJobs)} hint="Broj sync jobova koji trenutno djeluju svježe." icon={CheckCircle2} />
        <SummaryCard title="Treba pažnju" value={String(data.summary.attentionJobs)} hint="Jobovi sa zastarjelim, ali postojećim prolazom." icon={AlertTriangle} />
        <SummaryCard title="Bez podataka" value={String(data.summary.failedJobs)} hint="Jobovi za koje nema svježeg ili ikakvog loga." icon={ShieldAlert} />
        <SummaryCard title="Ukupno jobova" value={String(data.jobs.length)} hint="Kompletna jutarnja lista koju želiš imati na jednom mjestu." icon={ServerCog} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Play className="size-4 text-blue-700" />
              <CardTitle className="text-slate-950">Akcije</CardTitle>
            </div>
            <CardDescription>Ručni sync bez odlaska na cron rute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" onClick={handleRunSync} disabled={running}>
              {running ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? "Pokreće se sync..." : "Pokreni sync sada"}
            </Button>

            {result ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold">Sync završen: {result.status}</p>
                <p className="mt-1">Dodano: {result.total_added ?? 0} · Ažurirano: {result.total_updated ?? 0}</p>
                <p className="mt-1">Trajanje: {result.duration_ms ? `${Math.round(result.duration_ms / 1000)}s` : "nije dostupno"}</p>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              Ova akcija pokreće puni sync isti kao operativni job. Koristi je kada vidiš da nešto kasni ili kada želiš odmah osvježiti stanje portala.
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Stvari koje traže pažnju</CardTitle>
            <CardDescription>Bez fancy lingo: ovo je lista tehničkih stvari koje trenutno nisu potpuno uredne.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.issues.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  Trenutno nema zabilježenih tehničkih stvari koje traže intervenciju.
                </div>
              ) : (
                data.issues.map((issue) => (
                  <div key={issue.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">{issue.title}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", issue.tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                        {issue.tone === "danger" ? "hitno" : "pažnja"}
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
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Svi jutarnji sync jobovi</h2>
          <p className="mt-1 text-sm text-slate-600">Kompletna tehnička lista iz starog panela, samo prepisana normalnim jezikom.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          {data.jobs.map((job) => (
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
                <p className="text-sm leading-6 text-slate-600">{job.plainMessage}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Dodano</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{job.recordsAdded}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ažurirano</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{job.recordsUpdated}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  {job.durationLabel}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
