import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Building2,
  Clock,
  ExternalLink,
  FileText,
  Lock,
  Sparkles,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StartBidButton } from "@/components/tenders/start-bid-button";
import { UpgradeButton } from "@/components/subscription/upgrade-button";
import { TenderTimeline } from "@/components/tenders/tender-timeline";
import { TenderDecisionSummary } from "@/components/tenders/tender-decision-summary";
import { CompetitorsCard } from "@/components/intelligence/competitors-card";
import { WatchButton } from "@/components/watchlist/watch-button";
import {
  getTenderDecisionInsights,
  type TenderDecisionSignal,
  type TenderDecisionTender,
} from "@/lib/tender-decision";
import { getCompetitors, getSimilarTenders } from "@/lib/competitor-intelligence";
import { isWatched } from "@/lib/watchlist";
import { getOpenAIClient } from "@/lib/openai";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import type { Company, Tender } from "@/types/database";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return "text-slate-500";
  const diffDays = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "text-slate-400 line-through";
  if (diffDays <= 7) return "rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-600";
  return "rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700";
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
      "Napiši kratki, informativan opis javne nabavke na bosanskom jeziku (2-3 rečenice).",
      `Naslov nabavke: ${title}`,
      authority ? `Naručilac: ${authority}` : null,
      contractType ? `Vrsta ugovora: ${contractType}` : null,
      procedureType ? `Vrsta procedure: ${procedureType}` : null,
      "Opis treba biti konkretan i opisivati šta se tenderom nabavlja, bez ponavljanja naslova doslovno.",
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

function getAgencyClientIdFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  const match = referer.match(/\/dashboard\/agency\/clients\/([^/?#]+)/);
  return match?.[1] ?? null;
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

  const headerStore = await headers();
  const referer = headerStore.get("referer");
  const agencyClientIdFromReferer = getAgencyClientIdFromReferer(referer);

  const subscription = await getSubscriptionStatus(user.id, user.email, supabase);
  const { plan, isSubscribed } = subscription;
  const isLockedForFree = plan.id === "basic";
  const isAgency = plan.id === "agency";

  if (isAgency && agencyClientIdFromReferer) {
    redirect(`/dashboard/agency/clients/${agencyClientIdFromReferer}/tenders/${id}`);
  }

  const [{ data: tenderData }, { data: companyData }] = await Promise.all([
    supabase.from("tenders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("companies")
      .select("id, jib, industry, keywords, cpv_codes, operating_regions")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const tender = tenderData as Tender | null;
  if (!tender) redirect("/dashboard/tenders");

  const company = companyData as Company | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relevanceResult = company
    ? await (supabase as any)
        .from("tender_relevance")
        .select("score, confidence")
        .eq("company_id", company.id)
        .eq("tender_id", id)
        .maybeSingle()
    : { data: null };
  const relevanceRow = relevanceResult.data as { score: number; confidence: number } | null;

  const [existingBidResult, tenderCountResult, awardsResult] = await Promise.all([
    company
      ? supabase
          .from("bids")
          .select("id")
          .eq("company_id", company.id)
          .eq("tender_id", id)
          .limit(1)
          .maybeSingle()
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
  } | null = null;

  if (tender.contracting_authority_jib) {
    const awards = awardsResult.data ?? [];
    const awardCount = awardsResult.count ?? 0;
    const discounts = awards
      .map((row) => (row as { discount_pct: number | null }).discount_pct)
      .filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(value));

    authorityStats = {
      totalTenders: tenderCountResult.count ?? 0,
      totalAwards: awardCount,
      avgDiscount:
        discounts.length > 0
          ? Math.round((discounts.reduce((sum, value) => sum + value, 0) / discounts.length) * 100) / 100
          : null,
    };
  }

  const aiDescription = process.env.OPENAI_API_KEY
    ? await generateAiDescription(
        tender.title,
        tender.contracting_authority,
        tender.contract_type,
        tender.procedure_type,
      )
    : null;

  // ── Nove intelligence sekcije: price, win probability, competitors ──
  const [competitors, similarTenders, isAuthorityWatched, isCpvWatched] =
    isLockedForFree
      ? [[], [], false, false]
      : await Promise.all([
          getCompetitors({
            cpvCode: tender.cpv_code,
            authorityJib: tender.contracting_authority_jib,
            excludeJib: (company as Company & { jib?: string } | null)?.jib,
            limit: 5,
          }),
          getSimilarTenders({
            cpvCode: tender.cpv_code,
            authorityJib: tender.contracting_authority_jib,
            limit: 5,
          }),
          tender.contracting_authority_jib
            ? isWatched(user.id, "authority", tender.contracting_authority_jib)
            : Promise.resolve(false),
          tender.cpv_code
            ? isWatched(user.id, "cpv", tender.cpv_code.replace(/[^0-9]/g, "").slice(0, 3))
            : Promise.resolve(false),
        ]);

  const timelinePhases = [
    { key: "published", label: "Objava", date: tender.created_at ?? null },
    { key: "bid_deadline", label: "Rok za ponude", date: tender.deadline ?? null },
  ];
  const decisionSignals = new Map<string, TenderDecisionSignal>();
  if (relevanceRow) {
    decisionSignals.set(tender.id, {
      relevanceScore: relevanceRow.score,
      confidence: relevanceRow.confidence,
      reasons: [`Usklađenost s profilom ${relevanceRow.score}/10`],
    });
  }
  const decisionInsight =
    !isLockedForFree
      ? (await getTenderDecisionInsights(
          supabase,
          [tender as TenderDecisionTender],
          company
            ? {
                id: company.id,
                jib: company.jib,
                industry: company.industry,
                keywords: company.keywords,
                cpv_codes: company.cpv_codes,
                operating_regions: company.operating_regions,
              }
            : null,
          decisionSignals,
        )).get(tender.id) ?? null
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <div>
        <Link href="/dashboard/tenders">
          <Button variant="outline" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="size-4" />
            Nazad na tendere
          </Button>
        </Link>
      </div>

      {isLockedForFree ? (
        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm sm:p-8">
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center py-4 text-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <Lock className="size-8" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-slate-950">Puni detalji su rezervisani za pretplatnike</h2>
            <p className="mb-8 text-lg leading-relaxed text-slate-600">
              Kao korisnik Besplatnog naloga dobili ste signal da ovaj tender postoji. Da biste vidjeli sve detalje, CPV kodove, analitiku naručioca i pokrenuli pripremu, potrebno je aktivirati jedan od plaćenih paketa.
            </p>
            <UpgradeButton
              eventName="CLICK_UPGRADE_TENDER_DETAIL"
              metadata={{ tenderId: id }}
              className="h-14 rounded-xl bg-blue-600 px-10 text-lg font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Otključaj puni pristup
            </UpgradeButton>
          </div>
        </div>
      ) : null}

      <div className={isLockedForFree ? "pointer-events-none select-none opacity-40 blur-md transition-all" : ""}>
        <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-primary">
              {tender.contract_type || "Tender"}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {tender.status || "Aktivan"}
            </span>
          </div>
          <h1 className="mb-6 text-2xl font-heading font-bold leading-tight text-slate-900 sm:text-3xl">
            {tender.title}
          </h1>

          <div className="grid gap-5 border-t border-slate-50 pt-6 sm:grid-cols-3 sm:gap-6">
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
          </div>
        </div>

        <TenderDecisionSummary
          insight={decisionInsight}
          startBidSlot={
            company ? (
              <StartBidButton
                tenderId={id}
                existingBidId={existingBidId}
                isSubscribed={isSubscribed}
                className="h-11 w-full rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 sm:w-auto"
              />
            ) : isAgency ? (
              <Button
                asChild
                className="h-11 w-full rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 sm:w-auto"
              >
                <Link href="/dashboard/agency">Odaberi klijenta za pripremu</Link>
              </Button>
            ) : null
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {aiDescription ? (
              <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/40 p-5 shadow-sm sm:rounded-[1.5rem] sm:p-8">
                <h3 className="mb-1 flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
                  <Sparkles className="size-5 text-blue-500" />
                  Opis predmeta nabavke
                </h3>
                <p className="mb-4 text-xs font-medium text-blue-600">Generirano na osnovu dostupnih podataka</p>
                <p className="text-sm leading-relaxed text-slate-700">{aiDescription}</p>
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[1.5rem] sm:p-8">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
                  <FileText className="size-5 text-slate-300" />
                  Opis predmeta nabavke
                </h3>
                <p className="text-sm text-slate-400">Detaljan opis nije dostupan za ovaj tender.</p>
              </div>
            )}

            <div className="rounded-[1.35rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[1.5rem] sm:p-6">
              <h3 className="mb-4 text-base font-bold text-slate-900">Šta dobijate odmah</h3>
              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
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

          <div className="space-y-6">
            {/* Watch dugmad za brzi follow */}
            {(tender.contracting_authority_jib || tender.cpv_code) && !isLockedForFree && (
              <div className="flex flex-wrap gap-2 rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-sm">
                {tender.contracting_authority_jib && (
                  <WatchButton
                    entityType="authority"
                    entityKey={tender.contracting_authority_jib}
                    entityLabel={tender.contracting_authority}
                    isWatched={isAuthorityWatched}
                    redirectTo={`/dashboard/tenders/${id}`}
                    size="sm"
                  />
                )}
                {tender.cpv_code && (
                  <WatchButton
                    entityType="cpv"
                    entityKey={tender.cpv_code.replace(/[^0-9]/g, "").slice(0, 3)}
                    entityLabel={`CPV ${tender.cpv_code}`}
                    isWatched={isCpvWatched}
                    redirectTo={`/dashboard/tenders/${id}`}
                    size="sm"
                  />
                )}
              </div>
            )}

            {/* Timeline nabavke */}
            <TenderTimeline phases={timelinePhases} />

            {/* Competitor intelligence */}
            <CompetitorsCard competitors={competitors} similar={similarTenders} />

            {authorityStats ? (
              <div className="rounded-[1.35rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[1.5rem] sm:p-6">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-heading font-bold text-slate-900">
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
                {authorityStats.avgDiscount !== null && authorityStats.totalAwards > 0 ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Prosječni popust pobjednika
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-heading font-bold text-slate-900">
                        {authorityStats.avgDiscount}%
                      </span>
                      <span className="text-xs text-slate-500">ispod procijenjene</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Na osnovu {authorityStats.totalAwards} dodjela
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tender.portal_url ? (
              <div className="rounded-[1.35rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[1.5rem] sm:p-6">
                <h3 className="mb-4 text-base font-bold text-slate-900">Izvorni dokument</h3>
                <a
                  href={tender.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                >
                  <ExternalLink className="size-4" />
                  Otvori na portalu
                </a>
              </div>
            ) : null}
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
  icon: ReactNode;
  label: string;
  value: string;
  subValue?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
        {icon}
        {label}
      </div>
      <p className={`text-base font-medium text-slate-900 ${valueClassName || ""}`}>{value}</p>
      {subValue ? <p className="text-xs text-slate-500">{subValue}</p> : null}
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
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
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
