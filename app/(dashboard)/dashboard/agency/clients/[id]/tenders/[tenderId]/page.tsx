import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Building2,
  Clock,
  ExternalLink,
  FileText,
  Sparkles,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StartBidButton } from "@/components/tenders/start-bid-button";
import { getOpenAIClient } from "@/lib/openai";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import type { Tender } from "@/types/database";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return "text-slate-500";
  const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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

export default async function AgencyClientTenderDetailPage({
  params,
}: {
  params: Promise<{ id: string; tenderId: string }>;
}) {
  const { id: agencyClientId, tenderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (!isAgencyPlan(plan)) redirect("/dashboard");

  const [{ data: agencyClient }, { data: tenderData }] = await Promise.all([
    supabase
      .from("agency_clients")
      .select("id, company_id, companies(id, name)")
      .eq("id", agencyClientId)
      .eq("agency_user_id", user.id)
      .maybeSingle(),
    supabase.from("tenders").select("*").eq("id", tenderId).maybeSingle(),
  ]);

  if (!agencyClient) notFound();

  const company = agencyClient.companies as { id: string; name: string } | null;
  if (!company) notFound();

  const tender = tenderData as Tender | null;
  if (!tender) notFound();

  const [existingBidResult, tenderCountResult, awardsResult] = await Promise.all([
    supabase
      .from("bids")
      .select("id")
      .eq("company_id", company.id)
      .eq("tender_id", tenderId)
      .limit(1)
      .maybeSingle(),
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

  const clientBase = `/dashboard/agency/clients/${agencyClientId}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <div>
        <Link href={`${clientBase}/tenders`}>
          <Button variant="outline" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="size-4" />
            Nazad na tendere klijenta
          </Button>
        </Link>
      </div>

      <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-primary">
            {tender.contract_type || "Tender"}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            {tender.status || "Aktivan"}
          </span>
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
            Klijent: {company.name}
          </span>
        </div>

        <h1 className="mb-6 text-2xl font-heading font-bold leading-tight text-slate-900 sm:text-3xl">
          {tender.title}
        </h1>

        <div className="grid gap-5 border-t border-slate-50 pt-6 sm:grid-cols-3 sm:gap-6">
          <InfoItem
            icon={<Building2 className="size-4" />}
            label="Naručilac"
            value={tender.contracting_authority || "-"}
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
            value={tender.procedure_type || "-"}
          />
        </div>
      </div>

      <div className="rounded-[1.6rem] bg-slate-950 px-5 py-6 shadow-xl shadow-slate-950/20 sm:rounded-[2rem] sm:px-8 sm:py-7">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl text-white">
            <p className="text-2xl font-heading font-bold leading-snug text-white">
              {existingBidId ? "Nastavite pripremu ponude" : "Pripremite ponudu profesionalno"}
            </p>
            <p className="mt-2 text-base leading-relaxed text-slate-400">
              Odmah dobijete početnu listu koraka, dokumenata i zahtjeva za klijenta {company.name}, bez ručnog sastavljanja.
            </p>
          </div>
          <div className="flex-shrink-0 sm:pl-8">
            <StartBidButton
              tenderId={tenderId}
              existingBidId={existingBidId}
              agencyClientId={agencyClientId}
              bidPathBase={`${clientBase}/bids`}
              isSubscribed={true}
              className="h-14 w-full rounded-2xl bg-blue-500 px-8 text-base font-bold text-white shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-400 hover:shadow-blue-500/30 sm:w-auto"
            />
          </div>
        </div>
      </div>

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
              <p className="text-sm text-slate-500">Detaljan opis nije dostupan za ovaj tender.</p>
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Prosječni popust pobjednika
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-heading font-bold text-slate-900">
                      {authorityStats.avgDiscount}%
                    </span>
                    <span className="text-xs text-slate-500">ispod procijenjene</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Na osnovu {authorityStats.totalAwards} dodjela</p>
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
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
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
        <div className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm">{icon}</div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-lg font-bold text-slate-900">{value}</span>
    </div>
  );
}
