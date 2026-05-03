import Link from "next/link";
import { redirect } from "next/navigation";
import { BidsTable, type BidRow } from "@/components/bids/bids-table";
import { NewBidModal } from "@/components/bids/new-bid-modal";
import { Button } from "@/components/ui/button";
import { BID_STATUS_LABELS } from "@/lib/bids/constants";
import { demoBidSummaries, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import type { Company, BidStatus } from "@/types/database";
import { BarChart3, CheckCircle2, Clock3, FileCheck2, Trophy } from "lucide-react";

interface TenderRelation {
  id: string;
  title: string;
  contracting_authority: string | null;
  deadline: string | null;
}

interface CompanyRelation {
  id: string;
  name: string;
}

interface BidWithTender {
  id: string;
  status: BidStatus;
  created_at: string;
  company_id: string;
  tenders: TenderRelation | TenderRelation[] | null;
}

function normalizeBidTender(tender: TenderRelation | TenderRelation[] | null) {
  if (Array.isArray(tender)) {
    return tender[0] ?? null;
  }

  return tender;
}

function normalizeCompanyRelation(company: CompanyRelation | CompanyRelation[] | null) {
  if (Array.isArray(company)) {
    return company[0] ?? null;
  }

  return company;
}

function BidsPageFallback() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-slate-900 shadow-sm sm:p-8">
        <h1 className="text-2xl font-heading font-bold">
          Ponude trenutno nisu dostupne
        </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Došlo je do problema pri učitavanju ponuda. Pokušajte ponovo za nekoliko
            trenutaka ili se vratite na početnu stranicu dok provjerimo podatke u pozadini.
          </p>
          <div className="mt-5">
            <Button asChild className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
              <Link href="/dashboard">Nazad na početnu</Link>
            </Button>
          </div>
      </section>
    </div>
  );
}

function AgencyBidsShell({ bids }: { bids: BidRow[] }) {
  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_18%,transparent_75%)]" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              <BarChart3 className="size-3.5 text-sky-300" />
              Agency bids
            </span>
            <h1 className="mt-4 text-3xl font-heading font-bold text-white sm:text-4xl">
              Ponude svih klijenata
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Sve ponude vasih klijenata na jednom mjestu, sa cistim status
              signalima i brzim akcijama bez guzve u tabeli.
            </p>
          </div>
          <Button
            asChild
              className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Link href="/dashboard/agency">Odaberi klijenta za novu ponudu</Link>
            </Button>
        </div>
      </section>

      <BidsKpiStrip bids={bids} />
      <BidsTable
        bids={bids}
        showClientColumn
      />
    </div>
  );
}

function PersonalBidsShell({
  bids,
  tenders,
}: {
  bids: BidRow[];
  tenders: Array<{ id: string; title: string; contracting_authority: string | null }>;
}) {
  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_18%,transparent_75%)]" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              <FileCheck2 className="size-3.5 text-emerald-300" />
              Bid cockpit
            </span>
            <h1 className="mt-4 text-3xl font-heading font-bold text-white sm:text-4xl">
              Moje ponude
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Sve aktivne i završene ponude na jednom mjestu, sa jasnim statusom i brzim akcijama.
              </p>
          </div>
          <NewBidModal tenders={tenders} />
        </div>
      </section>

      <BidsKpiStrip bids={bids} />
      <BidsTable bids={bids} />
    </div>
  );
}

function BidsKpiStrip({ bids }: { bids: BidRow[] }) {
  const currentTime = new Date().getTime();
  const activeCount = bids.filter((bid) => ["draft", "in_review", "submitted"].includes(bid.status)).length;
  const wonCount = bids.filter((bid) => bid.status === "won").length;
  const submittedCount = bids.filter((bid) => bid.status === "submitted").length;
  const overdueCount = bids.filter((bid) => {
    const deadline = bid.tender?.deadline;
    return deadline ? new Date(deadline).getTime() < currentTime && !["won", "lost"].includes(bid.status) : false;
  }).length;
  const cards = [
    { title: "Ukupno", value: bids.length, description: "Sve ponude", icon: BarChart3, tone: "bg-blue-50 text-blue-600" },
    { title: "Aktivne", value: activeCount, description: "Nacrt, priprema i predano", icon: Clock3, tone: "bg-amber-50 text-amber-600" },
    { title: "Predane", value: submittedCount, description: BID_STATUS_LABELS.submitted, icon: CheckCircle2, tone: "bg-sky-50 text-sky-600" },
    { title: "Dobijene", value: wonCount, description: "Zaključene pobjede", icon: Trophy, tone: "bg-emerald-50 text-emerald-600" },
    { title: "Rok istekao", value: overdueCount, description: "Potrebna provjera", icon: FileCheck2, tone: "bg-rose-50 text-rose-600" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.title} className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">{card.title}</p>
                <p className="mt-1 text-2xl font-semibold tracking-normal text-[var(--text-primary)]">{card.value}</p>
              </div>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] ${card.tone}`}>
                <Icon className="size-5" />
              </span>
            </div>
            <p className="mt-4 text-xs text-[var(--text-tertiary)]">{card.description}</p>
          </article>
        );
      })}
    </section>
  );
}

export default async function BidsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = isAgencyPlan(plan);
  const isDemoAccount = isDemoUser(user.email);

  if (isAgency) {
    try {
      const { data: agencyClientRows, error: agencyClientError } = await supabase
        .from("agency_clients")
        .select("id, company_id, companies (id, name)")
        .eq("agency_user_id", user.id);

      if (agencyClientError) {
        throw agencyClientError;
      }

      const clientCompanies = (agencyClientRows ?? []).map((row) => {
        const company = normalizeCompanyRelation(
          row.companies as CompanyRelation | CompanyRelation[] | null
        );

        return {
          agencyClientId: row.id,
          companyId: company?.id ?? row.company_id,
          companyName: company?.name ?? "Nepoznat",
        };
      });

      const companyIds = clientCompanies.map((company) => company.companyId);
      const companyMetaMap = new Map(
        clientCompanies.map((company) => [
          company.companyId,
          { agencyClientId: company.agencyClientId, companyName: company.companyName },
        ])
      );

      let agencyBids: BidRow[] = [];

      if (companyIds.length > 0) {
        const { data: bidsData, error: bidsError } = await supabase
          .from("bids")
          .select(
            "id, status, created_at, company_id, tenders(id, title, contracting_authority, deadline)"
          )
          .in("company_id", companyIds)
          .order("created_at", { ascending: false });

        if (bidsError) {
          throw bidsError;
        }

        agencyBids = ((bidsData as BidWithTender[] | null) ?? []).map((bid) => ({
          id: bid.id,
          status: bid.status,
          created_at: bid.created_at,
          tender: normalizeBidTender(bid.tenders),
          clientName: companyMetaMap.get(bid.company_id)?.companyName ?? "Nepoznat",
          clientId: companyMetaMap.get(bid.company_id)?.agencyClientId ?? "",
        }));
      }

      return <AgencyBidsShell bids={agencyBids} />;
    } catch (error) {
      console.error("Dashboard bids page agency error:", error);
      return <BidsPageFallback />;
    }
  }

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Company | null;
  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as Company;

  try {
    const { data: bidsData, error: bidsError } = await supabase
      .from("bids")
      .select(
        "id, status, created_at, company_id, tenders(id, title, contracting_authority, deadline)"
      )
      .eq("company_id", resolvedCompany.id)
      .order("created_at", { ascending: false });

    if (bidsError) {
      throw bidsError;
    }

    const bids = ((bidsData as BidWithTender[] | null) ?? []).map((bid) => ({
      id: bid.id,
      status: bid.status,
      created_at: bid.created_at,
      tender: normalizeBidTender(bid.tenders),
    }));

    const displayBids: BidRow[] =
      bids.length > 0
        ? bids
        : isDemoAccount
          ? demoBidSummaries.map((bid) => ({
              id: bid.id,
              status: bid.status,
              created_at: bid.created_at,
              tender: {
                id: bid.tender.id,
                title: bid.tender.title,
                contracting_authority: bid.tender.contracting_authority,
                deadline: bid.tender.deadline,
              },
            }))
          : [];

    const { data: tendersData, error: tendersError } = await supabase
      .from("tenders")
      .select("id, title, contracting_authority")
      .order("created_at", { ascending: false })
      .limit(500);

    if (tendersError) {
      throw tendersError;
    }

    const tenders = (tendersData ?? []) as Array<{
      id: string;
      title: string;
      contracting_authority: string | null;
    }>;

    return <PersonalBidsShell bids={displayBids} tenders={tenders} />;
  } catch (error) {
    console.error("Dashboard bids page error:", error);
    return <BidsPageFallback />;
  }
}
