import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoBidSummaries, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import type { Company, BidStatus } from "@/types/database";
import { BidsTable } from "@/components/bids/bids-table";
import { NewBidModal } from "@/components/bids/new-bid-modal";

interface BidWithTender {
  id: string;
  status: BidStatus;
  created_at: string;
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

  const isDemoAccount = isDemoUser(user.email);
  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib")
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
    .select("id, status, created_at, tenders(id, title, contracting_authority, deadline)")
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
            Upravljanje Ponudama
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Pregled svih vaših aktivnih i završenih ponuda na jednom mjestu.
          </p>
        </div>
        <NewBidModal tenders={tenders} />
      </div>

      <BidsTable bids={displayBids} />
    </div>
  );
}
