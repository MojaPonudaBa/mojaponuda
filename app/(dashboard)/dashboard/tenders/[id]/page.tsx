import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tender, Company } from "@/types/database";
import { Button } from "@/components/ui/button";
import { StartBidButton } from "@/components/tenders/start-bid-button";
import { getSubscriptionStatus } from "@/lib/subscription";
import { UpgradeButton } from "@/components/subscription/upgrade-button";
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
  Lock,
} from "lucide-react";

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

  const [subscription, { data: tenderData }, { data: companyData }] = await Promise.all([
    getSubscriptionStatus(user.id, user.email, supabase),
    supabase.from("tenders").select("*").eq("id", id).single(),
    supabase.from("companies").select("id").eq("user_id", user.id).single(),
  ]);

  const { plan, isSubscribed } = subscription;
  const isLockedForFree = plan.id === "basic";

  const tender = tenderData as Tender | null;
  if (!tender) redirect("/dashboard/tenders");

  const company = companyData as Company | null;

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

    authorityStats = {
      totalTenders: tenderCountResult.count ?? 0,
      totalAwards: awardCount,
      avgDiscount,
    };
  }

  // Always generate AI description (real portal descriptions are often poor or missing)
  const aiDescription = process.env.OPENAI_API_KEY
    ? await generateAiDescription(
        tender.title,
        tender.contracting_authority,
        tender.contract_type,
        tender.procedure_type,
      )
    : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link href="/dashboard/tenders">
          <Button variant="outline" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="size-4" />
            Nazad na tendere
          </Button>
        </Link>
      </div>

      {isLockedForFree && (
        <div className="rounded-[2.5rem] bg-[linear-gradient(110deg,#1e1b4b_0%,#0f172a_100%)] p-8 text-white shadow-2xl relative overflow-hidden border border-blue-500/20">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Lock className="size-32 rotate-12" />
           </div>
           <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto py-4">
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                 <Lock className="size-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                 Puni detalji su rezervisani za pretplatnike
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed mb-8">
                Kao korisnik Besplatnog naloga dobili ste signal da ovaj tender postoji. Da biste vidjeli sve detalje, CPV kodove, analitiku naručioca i pokrenuli pripremu, potrebno je aktivirati jedan od plaćenih paketa.
              </p>
              <UpgradeButton 
                eventName="CLICK_UPGRADE_TENDER_DETAIL" 
                metadata={{ tenderId: id }}
                className="rounded-2xl bg-white text-slate-950 font-bold hover:bg-blue-50 px-10 h-14 text-lg"
              >
                Otključaj puni pristup
              </UpgradeButton>
           </div>
        </div>
      )}

      <div className={isLockedForFree ? "blur-md pointer-events-none select-none opacity-40 transition-all" : ""}>
        {/* Hero header */}
        <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-primary">
            {tender.contract_type || "Tender"}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            {tender.status || "Aktivan"}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 leading-tight mb-6">
          {tender.title}
        </h1>

        <div className="grid gap-6 sm:grid-cols-3 pt-6 border-t border-slate-50">
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

      {/* CTA banner — dark, prominent */}
      {company && (
        <div className="rounded-[2rem] bg-slate-950 px-8 py-7 shadow-xl shadow-slate-950/20">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white max-w-2xl">
              <p className="text-2xl font-heading font-bold text-white leading-snug">
                {existingBidId ? "Nastavite pripremu ponude" : "Pripremite ponudu profesionalno"}
              </p>
              <p className="mt-2 text-base text-slate-400 leading-relaxed">
                Odmah dobijete početnu listu koraka, dokumenata i zahtjeva — bez ručnog sastavljanja.
              </p>
            </div>
            <div className="flex-shrink-0 sm:pl-8">
              <StartBidButton
                tenderId={id}
                existingBidId={existingBidId}
                isSubscribed={isSubscribed}
                className="h-14 w-full sm:w-auto rounded-2xl bg-blue-500 px-8 text-base font-bold text-white shadow-xl shadow-blue-500/20 hover:bg-blue-400 hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content + sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* Description — always AI generated */}
          {aiDescription ? (
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
                Detaljan opis nije dostupan za ovaj tender.
              </p>
            </div>
          )}

          {/* What you get */}
          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Šta dobijate odmah</h3>
            <div className="grid gap-3 sm:grid-cols-3 text-sm text-slate-600">
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

        {/* Sidebar */}
        <div className="space-y-6">
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
                    Na osnovu {authorityStats.totalAwards} dodjel{authorityStats.totalAwards === 1 ? "e" : "a"}
                  </p>
                </div>
              )}
            </div>
          )}

          {tender.portal_url && (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">Izvorni dokument</h3>
              <div className="space-y-3">
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
            </div>
          )}
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
