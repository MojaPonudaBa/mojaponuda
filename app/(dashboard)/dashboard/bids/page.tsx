import Link from "next/link";
import { redirect } from "next/navigation";
import { BidsTable, type BidRow } from "@/components/bids/bids-table";
import { NewBidModal } from "@/components/bids/new-bid-modal";
import { Button } from "@/components/ui/button";
import { demoBidSummaries, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import type { Company, BidStatus } from "@/types/database";

interface BidWithTender {
  id: string;
  status: BidStatus;
  created_at: string;
  company_id: string;
  tenders:
    | {
        id: string;
        title: string;
        contracting_authority: string | null;
        deadline: string | null;
      }
    | {
        id: string;
        title: string;
        contracting_authority: string | null;
        deadline: string | null;
      }[]
    | null;
}

function normalizeBidTender(
  tender:
    | {
        id: string;
        title: string;
        contracting_authority: string | null;
        deadline: string | null;
      }
    | {
        id: string;
        title: string;
        contracting_authority: string | null;
        deadline: string | null;
      }[]
    | null
) {
  if (Array.isArray(tender)) {
    return tender[0] ?? null;
  }

  return tender;
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
    const { data: agencyClientRows } = await supabase
      .from("agency_clients")
      .select("id, company_id, companies (id, name)")
      .eq("agency_user_id", user.id);

    const clientCompanies = (agencyClientRows ?? []).map((row) => {
      const company = row.companies as { id: string; name: string } | null;
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
      ]),
    );

    let agencyBids: BidRow[] = [];

    if (companyIds.length > 0) {
      const { data: bidsData } = await supabase
        .from("bids")
        .select("id, status, created_at, company_id, tenders(id, title, contracting_authority, deadline)")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });

      agencyBids = ((bidsData as BidWithTender[] | null) ?? []).map((bid) => ({
        id: bid.id,
        status: bid.status,
        created_at: bid.created_at,
        tender: normalizeBidTender(bid.tenders),
        clientName: companyMetaMap.get(bid.company_id)?.companyName ?? "Nepoznat",
        clientId: companyMetaMap.get(bid.company_id)?.agencyClientId ?? "",
      }));
    }

    return (
      <div className="mx-auto max-w-[1200px] space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Ponude svih klijenata</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Sve ponude vasih klijenata na jednom mjestu, sa cistim status signalima i brzim akcijama bez guzve u tabeli.
              </p>
            </div>
            <Button
              asChild
              className="h-11 rounded-xl bg-white px-6 font-bold text-slate-950 shadow-lg shadow-slate-950/20 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <Link href="/dashboard/agency">Odaberi klijenta za novu ponudu</Link>
            </Button>
          </div>
        </section>

        <BidsTable
          bids={agencyBids}
          showClientColumn
          getBidHref={(bid) =>
            bid.clientId ? `/dashboard/agency/clients/${bid.clientId}/bids/${bid.id}` : `/dashboard/bids/${bid.id}`
          }
        />
      </div>
    );
  }

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Company | null;
  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as Company;
  const { data: bidsData } = await supabase
    .from("bids")
    .select("id, status, created_at, company_id, tenders(id, title, contracting_authority, deadline)")
    .eq("company_id", resolvedCompany.id)
    .order("created_at", { ascending: false });

  const bids = ((bidsData as BidWithTender[] | null) ?? []).map((bid) => ({
    id: bid.id,
    status: bid.status,
    created_at: bid.created_at,
    tender: normalizeBidTender(bid.tenders),
  }));

  const displayBids = bids.length > 0
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

  const { data: tendersData } = await supabase
    .from("tenders")
    .select("id, title, contracting_authority")
    .order("created_at", { ascending: false })
    .limit(500);

  const tenders = (tendersData ?? []) as Array<{ id: string; title: string; contracting_authority: string | null }>;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Moje ponude</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Sve aktivne i zavrsene ponude na jednom premium pregledu, sa jasnim statusom i akcijama koje ne pucaju na manjim sirinama.
            </p>
          </div>
          <NewBidModal tenders={tenders} />
        </div>
      </section>

      <BidsTable bids={displayBids} />
    </div>
  );
}
