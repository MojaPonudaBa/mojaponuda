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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ponude</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pripremajte, pratite i upravljajte ponudama za javne nabavke.
          </p>
        </div>
        <NewBidModal tenders={tenders} />
      </div>

      <BidsTable bids={bids} />
    </div>
  );
}
