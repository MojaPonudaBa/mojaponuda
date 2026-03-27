import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoBidSummaries, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { Company, BidStatus } from "@/types/database";
import { BidsTable } from "@/components/bids/bids-table";
import { NewBidModal } from "@/components/bids/new-bid-modal";

interface BidWithTender {
  id: string;
  status: BidStatus;
  created_at: string;
  company_id: string;
  tenders: {
    id: string;
    title: string;
    contracting_authority: string | null;
    deadline: string | null;
  };
}

export default async function BidsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = isAgencyPlan(plan);
  const isDemoAccount = isDemoUser(user.email);

  // Agency: fetch bids across all client companies
  if (isAgency) {
    const { data: acRows } = await supabase
      .from("agency_clients")
      .select("company_id, companies (id, name)")
      .eq("agency_user_id", user.id);

    const clientCompanies = (acRows ?? []).map((row) => {
      const c = row.companies as { id: string; name: string } | null;
      return { companyId: c?.id ?? row.company_id, companyName: c?.name ?? "Nepoznat" };
    });

    const companyIds = clientCompanies.map((c) => c.companyId);
    const companyNameMap = new Map(clientCompanies.map((c) => [c.companyId, c.companyName]));

    let agencyBids: { id: string; status: BidStatus; created_at: string; tender: { id: string; title: string; contracting_authority: string | null; deadline: string | null }; clientName: string }[] = [];

    if (companyIds.length > 0) {
      const { data: bidsData } = await supabase
        .from("bids")
        .select("id, status, created_at, company_id, tenders(id, title, contracting_authority, deadline)")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });

      agencyBids = ((bidsData as BidWithTender[] | null) ?? []).map((b) => ({
        id: b.id,
        status: b.status,
        created_at: b.created_at,
        tender: b.tenders,
        clientName: companyNameMap.get(b.company_id) ?? "Nepoznat",
      }));
    }

    const { data: tendersData } = await supabase
      .from("tenders")
      .select("id, title, contracting_authority")
      .order("created_at", { ascending: false })
      .limit(500);

    const tenders = (tendersData ?? []) as { id: string; title: string; contracting_authority: string | null }[];

    return (
      <div className="space-y-8 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
              Ponude svih klijenata
            </h1>
            <p className="mt-1 text-base text-slate-500">
              Sve ponude vaših klijenata na jednom mjestu. Svaka ponuda ima oznaku klijenta.
            </p>
          </div>
          <NewBidModal tenders={tenders} />
        </div>

        <BidsTable bids={agencyBids} showClientColumn />
      </div>
    );
  }

  // Regular user flow
  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Company | null;

  if (!isCompanyProfileComplete(company)) {
    redirect("/onboarding");
  }

  const resolvedCompany = company as Company;

  // Dohvati ponude s tender podacima
  const { data: bidsData } = await supabase
    .from("bids")
    .select("id, status, created_at, company_id, tenders(id, title, contracting_authority, deadline)")
    .eq("company_id", resolvedCompany.id)
    .order("created_at", { ascending: false });

  const bids = ((bidsData as BidWithTender[] | null) ?? []).map((b) => ({
    id: b.id,
    status: b.status,
    created_at: b.created_at,
    tender: b.tenders,
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

  // Dohvati sve tendere za modal
  const { data: tendersData } = await supabase
    .from("tenders")
    .select("id, title, contracting_authority")
    .order("created_at", { ascending: false })
    .limit(500);

  const tenders = (tendersData ?? []) as {
    id: string;
    title: string;
    contracting_authority: string | null;
  }[];

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Moje ponude
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Sve aktivne i završene ponude na jednom mjestu.
          </p>
        </div>
        <NewBidModal tenders={tenders} />
      </div>

      <BidsTable bids={displayBids} />
    </div>
  );
}
