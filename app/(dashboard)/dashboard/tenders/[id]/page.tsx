import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tender, Company } from "@/types/database";
import { Button } from "@/components/ui/button";
import { StartBidButton } from "@/components/tenders/start-bid-button";
import { QuickScanButton } from "@/components/tenders/quick-scan-button";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  ArrowLeft,
  Building2,
  Clock,
  Tag,
  FileText,
  ExternalLink,
  BarChart3,
  Calendar,
  Briefcase
} from "lucide-react";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return (
    new Intl.NumberFormat("bs-BA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " KM"
  );
}

function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return "text-slate-500";
  const diffDays = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "text-slate-400 line-through";
  if (diffDays <= 7) return "text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full";
  return "text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full";
}

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check subscription
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);

  // Dohvati tender
  const { data: tenderData } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", id)
    .single();

  const tender = tenderData as Tender | null;
  if (!tender) redirect("/dashboard/tenders");

  // Dohvati firmu korisnika
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;

  // Provjeri da li već postoji bid za ovaj tender
  let existingBidId: string | null = null;
  if (company) {
    const { data: existingBid } = await supabase
      .from("bids")
      .select("id")
      .eq("company_id", company.id)
      .eq("tender_id", id)
      .limit(1)
      .single();

    existingBidId = existingBid?.id ?? null;
  }

  // Historijat naručioca
  let authorityStats: {
    totalTenders: number;
    totalAwards: number;
    avgDiscount: number | null;
  } | null = null;

  if (tender.contracting_authority_jib) {
    const jib = tender.contracting_authority_jib;

    // Broj tendera ovog naručioca
    const { count: tenderCount } = await supabase
      .from("tenders")
      .select("id", { count: "exact", head: true })
      .eq("contracting_authority_jib", jib);

    // Odluke o dodjeli
    const { data: awards, count: awardCount } = await supabase
      .from("award_decisions")
      .select("discount_pct", { count: "exact" })
      .eq("contracting_authority_jib", jib);

    // Prosječni popust
    let avgDiscount: number | null = null;
    if (awards && awards.length > 0) {
      const discounts = awards
        .map((a) => a.discount_pct)
        .filter((d): d is number => d !== null && d !== undefined);
      if (discounts.length > 0) {
        avgDiscount =
          Math.round(
            (discounts.reduce((s, v) => s + v, 0) / discounts.length) * 100
          ) / 100;
      }
    }

    authorityStats = {
      totalTenders: tenderCount ?? 0,
      totalAwards: awardCount ?? 0,
      avgDiscount,
    };
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <Link href="/dashboard/tenders">
          <Button variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="mr-2 size-4" />
            Nazad na tendere
          </Button>
        </Link>
      </div>

      <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-primary">
              {tender.contract_type || "Tender"}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {tender.status || "Aktivan"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 leading-tight">
            {tender.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            {isSubscribed
              ? "Otvorite pripremu jednim klikom i odmah dobijte početnu listu onoga što treba pregledati prije slanja."
              : "Pregledajte tender, procijenite priliku i otvorite profesionalnu pripremu kada odlučite da vrijedi aplicirati."}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-6 border-t border-slate-50">
          <InfoItem
            icon={<Building2 className="size-4" />}
            label="Naručilac"
            value={tender.contracting_authority || "—"}
            subValue={tender.contracting_authority_jib ? `ID: ${tender.contracting_authority_jib}` : undefined}
          />
          <InfoItem
            icon={<Clock className="size-4" />}
            label="Rok za ponude"
            value={formatDate(tender.deadline)}
            valueClassName={getDeadlineColor(tender.deadline)}
          />
          <InfoItem
            icon={<Briefcase className="size-4" />}
            label="Procedura"
            value={tender.procedure_type || "—"}
          />
          <InfoItem
            icon={<BarChart3 className="size-4" />}
            label="Procijenjena vrijednost"
            value={formatValue(tender.estimated_value)}
            valueClassName="font-heading font-bold text-primary"
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {company ? (
            <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/40 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Profesionalna priprema</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Otvorite pripremu ponude i odmah dobijte početnu listu koraka, dokumenata i stvari koje treba provjeriti prije predaje.
                  </p>
                </div>
                <StartBidButton
                  tenderId={id}
                  existingBidId={existingBidId}
                  isSubscribed={isSubscribed}
                  className="h-14 rounded-2xl bg-slate-950 px-7 text-base font-bold text-white shadow-lg shadow-slate-950/10 hover:bg-blue-700"
                />
              </div>
            </div>
          ) : null}

          {tender.raw_description?.trim() ? (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
                <FileText className="size-5 text-slate-400" />
                Opis predmeta nabavke
              </h3>
              <div className="prose prose-sm max-w-none text-slate-600 prose-p:leading-relaxed">
                <p className="whitespace-pre-wrap">{tender.raw_description}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-heading font-bold text-slate-900">
                <FileText className="size-5 text-amber-500" />
                Opis nije objavljen
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isSubscribed ? (
                  <>
                    Za ovaj tender nema detaljnog opisa u javnim podacima. Kada kliknete <span className="font-bold text-slate-900">Započni pripremu ponude</span>, otvorit će se priprema sa početnom listom dokumenata i koraka složenom iz dostupnih podataka i tipičnih zahtjeva naručioca.
                  </>
                ) : (
                  <>
                    Za ovaj tender nema detaljnog opisa u javnim podacima. Uz pretplatu možete otvoriti profesionalnu pripremu i dobiti početnu listu dokumenata i koraka složenu iz dostupnih podataka i tipičnih zahtjeva naručioca.
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {authorityStats && (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-heading font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="size-5 text-slate-400" />
                Historijat naručioca
              </h3>
              
              <div className="space-y-4">
                <StatRow 
                  label="Ukupno tendera" 
                  value={String(authorityStats.totalTenders)} 
                  icon={<FileText className="size-4 text-blue-500" />}
                />
                <StatRow 
                  label="Dodijeljeni ugovori" 
                  value={String(authorityStats.totalAwards)} 
                  icon={<Tag className="size-4 text-emerald-500" />}
                />
                <div className="pt-4 mt-4 border-t border-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prosječni popust</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-heading font-bold text-slate-900">
                      {authorityStats.avgDiscount !== null ? `${authorityStats.avgDiscount}%` : "—"}
                    </span>
                    <span className="text-xs text-slate-500">ispod procijenjene</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Šta dobijate odmah</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                Početnu listu dokumentacije bez dodatnog ručnog sastavljanja.
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                Povezivanje postojećih dokumenata kada već imate nešto spremno.
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                Prostor za rad i završnu provjeru prije predaje ponude.
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Dodatne opcije</h3>
            <div className="mt-4 space-y-3">
              <QuickScanButton tenderId={id} isSubscribed={isSubscribed} />
              {tender.portal_url ? (
                <a
                  href={tender.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                >
                  <ExternalLink className="size-4" />
                  Otvori na portalu
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  subValue,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className={`text-base font-medium text-slate-900 ${valueClassName || ""}`}>{value}</p>
      {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
    </div>
  );
}

function StatRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-lg font-bold text-slate-900">{value}</span>
    </div>
  );
}
