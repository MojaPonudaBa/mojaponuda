import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;

  if (!company) {
    redirect("/onboarding");
  }

  // Dohvati ponude s tender podacima
  const { data: bidsData } = await supabase
    .from("bids")
    .select("id, status, created_at, tenders(id, title, contracting_authority, deadline)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const bids = ((bidsData as BidWithTender[] | null) ?? []).map((b) => ({
    id: b.id,
    status: b.status,
    created_at: b.created_at,
    tender: b.tenders,
  }));

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

      <BidsTable bids={bids} />
    </div>
  );
}
