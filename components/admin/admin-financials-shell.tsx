import { AlertTriangle, CalendarClock, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminFinancialEvent, AdminFinancialsData } from "@/lib/admin-operator";
import { cn } from "@/lib/utils";

interface AdminFinancialsShellProps {
  data: AdminFinancialsData;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("bs-BA", {
    style: "currency",
    currency: "BAM",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("bs-BA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  icon: typeof Wallet;
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

function toneClass(tone: AdminFinancialEvent["tone"]): string {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function AdminFinancialsShell({ data }: AdminFinancialsShellProps) {
  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(14,31,60,0.98)_50%,rgba(17,49,89,0.94)_100%)] p-8 text-white shadow-[0_45px_90px_-45px_rgba(2,6,23,0.88)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              Financials
            </Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Finansijski pregled bez komplikacije
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Ovdje vidiš trenutni MRR, novi prihod, neuspjele naplate i šta uskoro dolazi na obnovu. Brojevi su izvedeni iz pretplata evidentiranih u bazi.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Ažurirano</p>
            <p className="mt-2 font-semibold text-white">{formatDateTime(data.generatedAt)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="MRR" value={formatCurrency(data.mrr)} hint="Trenutni mjesečni prihod iz aktivnih pretplata." icon={Wallet} />
        <SummaryCard title="Ukupno prodano" value={formatCurrency(data.totalRevenue)} hint="Zbroj svih zabilježenih pretplata u bazi do sada." icon={ReceiptText} />
        <SummaryCard title="Prihod danas" value={formatCurrency(data.revenueToday)} hint="Nove pretplate evidentirane danas." icon={CreditCard} />
        <SummaryCard title="Prihod ovaj mjesec" value={formatCurrency(data.revenueMonth)} hint="Nove pretplate evidentirane ovaj mjesec." icon={CalendarClock} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Stanje naplate</CardTitle>
            <CardDescription>Tri broja koja treba gledati svaki dan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Aktivne pretplate</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{data.activeSubscriptions}</p>
              <p className="mt-1 text-sm text-slate-600">Računi koji trenutno uredno plaćaju.</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Neuspjela plaćanja</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{data.failedPayments}</p>
              <p className="mt-1 text-sm text-slate-600">Pretplate koje su trenutno `past_due`.</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Pred istekom</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{data.expiringSubscriptions}</p>
              <p className="mt-1 text-sm text-slate-600">Pretplate kojima period završava u narednih 7 dana.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <CardTitle className="text-slate-950">Brza interpretacija</CardTitle>
            </div>
            <CardDescription>Bez fancy lingo, samo šta broj znači.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              MRR pokazuje koliko trenutno vrijedi baza aktivnih pretplata na mjesečnom nivou.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              Prihod danas i ovaj mjesec pokazuju koliko je novih pretplata upravo ušlo, ne ukupnu historijsku naplatu iz Lemon Squeezy izvještaja.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              Ako broj `Neuspjela plaćanja` raste, prvo idi na follow-up i billing provjeru tih računa.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              Churn je {data.churnRate === null ? "trenutno bez dovoljno podataka." : `${data.churnRate}% na osnovu do sada otkazanih pretplata.`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Zadnje promjene na naplati</CardTitle>
            <CardDescription>Najnovije promjene na pretplatama, dovoljno za brzi pregled.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentEvents.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">{event.title}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", toneClass(event.tone))}>
                        {event.tone === "success"
                          ? "ok"
                          : event.tone === "warning"
                            ? "pažnja"
                            : event.tone === "danger"
                              ? "hitno"
                              : "info"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-950">{formatCurrency(event.amount)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.occurredAt)}</p>
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
