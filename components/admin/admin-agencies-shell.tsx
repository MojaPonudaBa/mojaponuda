"use client";

import { useMemo, useState } from "react";
import { Building2, MailPlus, ShieldCheck, ShieldX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminAgenciesData } from "@/lib/admin-operator";

interface AdminAgenciesShellProps {
  data: AdminAgenciesData;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminAgenciesShell({ data }: AdminAgenciesShellProps) {
  const [email, setEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const agencies = useMemo(() => data.agencies, [data.agencies]);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setInviteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Ne mogu kreirati agencijski nalog.");
      }

      setSuccess(payload.message ?? "Agencijski nalog je uspjeÅ¡no provisioniran.");
      setEmail("");
      window.location.reload();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "GreÅ¡ka pri kreiranju agencijskog naloga."
      );
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleDeactivate(userId: string) {
    setDeactivatingUserId(userId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/agencies/${userId}`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Ne mogu deaktivirati agencijski pristup.");
      }

      setSuccess(payload.message ?? "Agencijski pristup je deaktiviran.");
      window.location.reload();
    } catch (deactivateError) {
      setError(
        deactivateError instanceof Error ? deactivateError.message : "GreÅ¡ka pri deaktivaciji."
      );
    } finally {
      setDeactivatingUserId(null);
    }
  }

  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(14,31,60,0.98)_50%,rgba(17,49,89,0.94)_100%)] p-8 text-white shadow-[0_45px_90px_-45px_rgba(2,6,23,0.88)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              Agencije
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Invite-only provisioning za agencijske naloge
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Ovdje admin kreira agencijski pristup, prati postojeÄ‡e naloge i po potrebi gasi
                entitlement bez brisanja korisnika ili CRM historije.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">AÅ¾urirano</p>
            <p className="mt-2 font-semibold text-white">{formatDateTime(data.generatedAt)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ukupno
            </p>
            <Users className="size-5 text-slate-700" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-950">{data.summary.total}</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Aktivni
            </p>
            <ShieldCheck className="size-5 text-emerald-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-950">{data.summary.active}</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Neaktivni
            </p>
            <ShieldX className="size-5 text-amber-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-950">{data.summary.inactive}</p>
        </div>
        <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Complimentary
            </p>
            <Building2 className="size-5 text-blue-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-950">{data.summary.complimentary}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="font-heading text-2xl font-bold text-slate-900">
            Kreiraj agencijski nalog
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Unesite email i sistem Ä‡e provisionirati agency entitlement. Ako korisnik ne postoji,
            bit Ä‡e poslan invite link. Ako veÄ‡ postoji, pristup Ä‡e biti aktiviran na postojeÄ‡em
            raÄunu.
          </p>
        </div>

        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="agency-email">Email agencije</Label>
            <Input
              id="agency-email"
              type="email"
              placeholder="agencija@tendersistem.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={inviteLoading}
            />
          </div>
          <Button type="submit" disabled={inviteLoading} className="h-11 rounded-xl">
            <MailPlus className="mr-2 size-4" />
            {inviteLoading ? "Kreiram..." : "Kreiraj / pozovi"}
          </Button>
        </form>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            PostojeÄ‡i agencijski nalozi
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Aktivne i deaktivirane agencije, zajedno sa osnovnim statusom i brojem klijenata koje
            vode.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {agencies.map((agency) => (
            <div
              key={agency.userId}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">{agency.email}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        agency.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {agency.isActive ? "aktivan" : "deaktiviran"}
                    </span>
                    {agency.isComplimentary ? (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                        complimentary
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Kreiran: {formatDateTime(agency.createdAt)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-slate-200"
                  disabled={
                    !agency.isActive ||
                    agency.isComplimentary ||
                    deactivatingUserId === agency.userId
                  }
                  onClick={() => handleDeactivate(agency.userId)}
                >
                  {deactivatingUserId === agency.userId
                    ? "Deaktiviram..."
                    : "Deaktiviraj pristup"}
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Status pretplate
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {agency.subscriptionStatus ?? "bez zapisa"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Klijenti
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {agency.managedClients}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Pristup
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {agency.isActive ? "agency enabled" : "agency revoked"}
                  </p>
                </div>
              </div>

              {agency.isComplimentary ? (
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Ovaj nalog ima hardcoded complimentary agency pristup za testiranje i ne moÅ¾e se
                  deaktivirati iz admin panela.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

