import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tender, Company } from "@/types/database";
import { Button } from "@/components/ui/button";
import { StartBidButton } from "@/components/tenders/start-bid-button";
import { QuickScanButton } from "@/components/tenders/quick-scan-button";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getOpenAIClient } from "@/lib/openai";
import {
  ArrowLeft,
  Building2,
  Clock,
  Tag,
  FileText,
  ExternalLink,
  BarChart3,
  Briefcase,
  Sparkles,
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

async function generateAiDescription(
  title: string,
  authority: string | null,
  contractType: string | null,
  procedureType: string | null,
): Promise<string | null> {
  try {
    const openai = getOpenAIClient();
    const prompt = [
      `Napiši kratki, informativan opis javne nabavke na bosanskom jeziku (2-3 rečenice).`,
      `Naslov nabavke: ${title}`,
      authority ? `Naručilac: ${authority}` : null,
      contractType ? `Vrsta ugovora: ${contractType}` : null,
      procedureType ? `Vrsta procedure: ${procedureType}` : null,
      `Opis treba biti konkretan i opisivati šta se tenderom nabavlja, bez ponavljanja naslova doslovno.`,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.4,
    });

    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
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

  const [{ isSubscribed }, { data: tenderData }, { data: companyData }] = await Promise.all([
    getSubscriptionStatus(user.id, user.email, supabase),
    supabase.from("tenders").select("*").eq("id", id).single(),
    supabase.from("companies").select("id").eq("user_id", user.id).single(),
  ]);

  const tender = tenderData as Tender | null;
  if (!tender) redirect("/dashboard/tenders");

  const company = companyData as Company | null;

  // Check for existing bid and load authority stats in parallel
  const [existingBidResult, tenderCountResult, awardsResult] = await Promise.all([
    company
      ? supabase
          .from("bids")
          .select("id")
          .eq("company_id", company.id)
          .eq("tender_id", id)
          .limit(1)
          .single()
      : Promise.resolve({ data: null }),
    tender.contracting_authority_jib
      ? supabase
          .from("tenders")
          .select("id", { count: "exact", head: true })
          .eq("contracting_authority_jib", tender.contracting_authority_jib)
      : Promise.resolve({ count: null }),
    tender.contracting_authority_jib
      ? supabase
          .from("award_decisions")
          .select("discount_pct, winning_price", { count: "exact" })
          .eq("contracting_authority_jib", tender.contracting_authority_jib)
      : Promise.resolve({ data: null, count: null }),
  ]);

  const existingBidId = existingBidResult.data?.id ?? null;

  let authorityStats: {
    totalTenders: number;
    totalAwards: number;
    avgDiscount: number | null;
    avgWinningPrice: number | null;
  } | null = null;

  if (tender.contracting_authority_jib) {
    const awards = awardsResult.data ?? [];
    const awardCount = awardsResult.count ?? 0;

    const discounts = awards
      .map((a) => (a as { discount_pct: number | null }).discount_pct)
      .filter((d): d is number => d !== null && d !== undefined && !isNaN(d));

    const avgDiscount =
      discounts.length > 0
        ? Math.round((discounts.reduce((s, v) => s + v, 0) / discounts.length) * 100) / 100
        : null;

    const prices = awards
      .map((a) => (a as { winning_price: number | null }).winning_price)
      .filter((p): p is number => p !== null && p !== undefined);

    const avgWinningPrice =
      prices.length > 0
        ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length)
        : null;

    authorityStats = {
      totalTenders: tenderCountResult.count ?? 0,
      totalAwards: awardCount,
      avgDiscount,
      avgWinningPrice,
    };
  }

  // Description: use real description if available, otherwise generate with AI
  const hasRealDescription = tender.raw_description?.trim();
  let aiDescription: string | null = null;
  if (!hasRealDescription && process.env.OPENAI_API_KEY) {
    aiDescription = await generateAiDescription(
      tender.title,
      tender.contracting_authority,
      tender.contract_type,
      tender.procedure_type,
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link href="/dashboard/tenders">
          <Button variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="mr-2 size-4" />
            Nazad na tendere
          </Button>
        </Link>
      </div>

      {/* Hero header card */}
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
            valueClassName={tender.estimated_value ? "font-heading font-bold text-primary" : "text-slate-400"}
          />
        </div>
      </div>

      {/* CTA — full width hero button */}
      {company && (
        <div className="rounded-[2rem] bg-slate-950 p-8 shadow-xl shadow-slate-950/20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                Profesionalna priprema
              </p>
              <p className="text-xl font-heading font-bold text-white leading-snug">
                {existingBidId
                  ? "Nastavite pripremu ponude"
                  : "Pripremite ponudu profesionalno"}
              </p>
              <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
                Odmah dobijete početnu listu koraka, dokumenata i zahtjeva — bez ručnog sastavljanja.
              </p>
            </div>
            <div className="flex-shrink-0">
              <StartBidButton
                tenderId={id}
                existingBidId={existingBidId}
                isSubscribed={isSubscribed}
                className="h-16 w-full sm:w-auto rounded-2xl bg-blue-500 px-10 text-lg font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main content + sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: description */}
        <div className="lg:col-span-2 space-y-6">
          {hasRealDescription ? (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
                <FileText className="size-5 text-slate-400" />
                Opis predmeta nabavke
              </h3>
              <div className="prose prose-sm max-w-none text-slate-600 prose-p:leading-relaxed">
                <p className="whitespace-pre-wrap">{tender.raw_description}</p>
              </div>
            </div>
          ) : aiDescription ? (
            <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/40 p-8 shadow-sm">
              <h3 className="mb-1 flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
                <Sparkles className="size-5 text-blue-500" />
                Opis predmeta nabavke
              </h3>
              <p className="text-xs text-blue-600 font-medium mb-4">AI generiran na osnovu dostupnih podataka</p>
              <p className="text-sm leading-relaxed text-slate-700">{aiDescription}</p>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
                <FileText className="size-5 text-slate-300" />
                Opis predmeta nabavke
              </h3>
              <p className="text-sm text-slate-400">
                Detaljan opis nije dostupan u javnim podacima za ovaj tender.
              </p>
            </div>
          )}

          {/* What you get */}
          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Šta dobijate odmah</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-600">
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
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">
          {/* Authority history */}
          {authorityStats && (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-heading font-bold text-slate-900 mb-5 flex items-center gap-2">
                <BarChart3 className="size-5 text-slate-400" />
                Historijat naručioca
              </h3>

              <div className="space-y-3">
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
              </div>

              {/* Avg discount — only show when meaningful data exists */}
              {authorityStats.avgDiscount !== null && authorityStats.totalAwards > 0 && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Prosječni popust pobjednika
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-heading font-bold text-slate-900">
                      {authorityStats.avgDiscount}%
                    </span>
                    <span className="text-xs text-slate-500">ispod procijenjene</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Na osnovu {authorityStats.totalAwards} dodjel{authorityStats.totalAwards === 1 ? "e" : "a"} ovog naručioca
                  </p>
                </div>
              )}

              {/* No discount data notice */}
              {authorityStats.avgDiscount === null && authorityStats.totalAwards > 0 && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Podaci o cijenama dodjela nisu dostupni za ovog naručioca.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Additional options */}
          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Dodatne opcije</h3>
            <div className="space-y-3">
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
