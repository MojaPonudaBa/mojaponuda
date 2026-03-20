import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink, FileSearch, MapPinned } from "lucide-react";
import { Pagination } from "@/components/tenders/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getTenderAreaGapReport,
  type TenderAreaGapReportItem,
} from "@/lib/tender-area-report";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

function formatDate(value: string | null): string {
  if (!value) {
    return "Bez roka";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getAuthorityStatusLabel(status: TenderAreaGapReportItem["authority_lookup_status"]): string {
  switch (status) {
    case "matched_with_geo":
      return "Organ pronađen s geo podacima";
    case "matched_without_geo":
      return "Organ pronađen bez geo podataka";
    case "not_matched":
      return "Organ nije povezan";
  }
}

function getReasonVariant(item: TenderAreaGapReportItem): "default" | "secondary" | "destructive" | "outline" {
  switch (item.likely_reason_code) {
    case "repairable_from_authority_registry":
    case "repairable_from_tender_text":
      return "default";
    case "authority_registry_without_location":
    case "missing_authority_match":
      return "outline";
    case "insufficient_tender_text":
      return "secondary";
    case "manual_review_required":
      return "destructive";
  }
}

export default async function TenderGeoReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const report = await getTenderAreaGapReport(supabase, {
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <MapPinned className="size-4" />
            Geo maintenance report
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-slate-900">
            Tenderi bez područja
          </h1>
          <p className="mt-1.5 max-w-3xl text-base text-slate-500">
            Pregled tendera koji još nemaju `area_label`, zajedno sa razlogom zašto nisu riješeni i koji je naredni najjači signal za popravku.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/tenders">
              <ArrowLeft className="size-4" />
              Nazad na tendere
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/api/reports/tender-area-gaps?page=${report.page}&pageSize=${report.page_size}`} target="_blank">
              <FileSearch className="size-4" />
              Otvori JSON
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardDescription>Ukupno nerešeno</CardDescription>
            <CardTitle className="text-3xl font-semibold text-slate-950">
              {report.total_unresolved}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">
            Trenutni backlog tendera bez dodijeljenog geo područja.
          </CardContent>
        </Card>

        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardDescription>Popravljivo iz registra</CardDescription>
            <CardTitle className="text-3xl font-semibold text-slate-950">
              {report.summary.repairable_from_authority_registry}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">
            Tenderi za koje već postoji dovoljan signal u registru ugovornih organa.
          </CardContent>
        </Card>

        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardDescription>Popravljivo iz teksta</CardDescription>
            <CardTitle className="text-3xl font-semibold text-slate-950">
              {report.summary.repairable_from_tender_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">
            Tenderi čiji naslov ili opis već daju dovoljno signala za automatsku popravku.
          </CardContent>
        </Card>

        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardDescription>Slabi tekstualni signali</CardDescription>
            <CardTitle className="text-3xl font-semibold text-slate-950">
              {report.summary.weak_text_signals}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">
            Tenderi čiji opis i naslov djeluju previše generički za pouzdano mapiranje.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle>Razlozi po kategorijama</CardTitle>
            <CardDescription>
              Najčešći uzroci zašto tender još nije dobio `area_label`.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.summary.reasons.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Trenutno nema otvorenih geo gap-ova.
              </div>
            ) : (
              report.summary.reasons.map((reason) => (
                <div
                  key={reason.code}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{reason.label}</p>
                    <p className="text-sm text-slate-500">Kod: {reason.code}</p>
                  </div>
                  <Badge variant="outline" className="text-slate-700">
                    {reason.count}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle>Status autoritativnog izvora</CardTitle>
            <CardDescription>
              Pregled koliko nerešenih tendera uopšte ima poveziv organ i kvalitetnu registry lokaciju.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span>Organ povezan s geo podacima</span>
              <span className="font-semibold text-slate-900">{report.summary.matched_authorities_with_geo}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span>Organ povezan bez geo podataka</span>
              <span className="font-semibold text-slate-900">{report.summary.matched_authorities_without_geo}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span>Organ nije povezan</span>
              <span className="font-semibold text-slate-900">{report.summary.missing_authority_matches}</span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              Jutarnji maintenance u 04:00 Europe/Sarajevo koristi isti resolver kao i ovaj izvještaj.
            </div>
          </CardContent>
        </Card>
      </div>

      {report.items.length === 0 ? (
        <Card className="border border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="flex items-center gap-3 py-6 text-emerald-800">
            <AlertTriangle className="size-5" />
            Trenutno nema tendera bez `area_label`.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {report.items.map((item) => (
            <Card key={item.id} className="border border-slate-200/70 shadow-sm">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg font-semibold text-slate-950">
                      <Link href={`/dashboard/tenders/${item.id}`} className="transition-colors hover:text-blue-700">
                        {item.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {item.contracting_authority ?? "Nepoznat ugovorni organ"}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getReasonVariant(item)}>{item.likely_reason_label}</Badge>
                    <Badge variant="outline">{getAuthorityStatusLabel(item.authority_lookup_status)}</Badge>
                    <Badge variant="outline">
                      Tekstualni signal: {item.text_signal_quality === "strong" ? "jak" : "slab"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Rok
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(item.deadline)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Registry label
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {item.authority_registry_label ?? "Nema geo podatka"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Deterministički prijedlog
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {item.suggested_next_area_label ?? "Nema pouzdanog prijedloga"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Portal ID
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.portal_id}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Zašto nije riješeno
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{item.likely_reason_detail}</p>
                </div>

                <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Sažetak opisa
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {item.description_preview ?? "Opis nije dostupan ili ne nosi koristan signal."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/tenders/${item.id}`}>Otvori tender</Link>
                    </Button>
                    {item.portal_url && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={item.portal_url} target="_blank">
                          Portal
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        currentPage={report.page}
        totalPages={report.total_pages}
        basePath="/dashboard/tenders/geo-report"
      />
    </div>
  );
}
