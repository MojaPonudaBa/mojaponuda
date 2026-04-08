import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ManagedCompanyAccess {
  companyId: string;
  agencyClientId: string | null;
}

export async function resolveManagedCompanyAccess(
  supabase: SupabaseServerClient,
  userId: string,
  agencyClientId?: string | null,
): Promise<ManagedCompanyAccess | null> {
  if (agencyClientId) {
    const { data: managedClient } = await supabase
      .from("agency_clients")
      .select("id, company_id")
      .eq("id", agencyClientId)
      .eq("agency_user_id", userId)
      .maybeSingle();

    if (!managedClient) {
      return null;
    }

    return {
      companyId: managedClient.company_id,
      agencyClientId: managedClient.id,
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!company) {
    return null;
  }

  return {
    companyId: company.id,
    agencyClientId: null,
  };
}

export async function resolveBidAccess(
  supabase: SupabaseServerClient,
  userId: string,
  bidId: string,
): Promise<ManagedCompanyAccess | null> {
  const { data: bid } = await supabase
    .from("bids")
    .select("id, company_id")
    .eq("id", bidId)
    .maybeSingle();

  if (!bid) {
    return null;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", bid.company_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (company) {
    return {
      companyId: company.id,
      agencyClientId: null,
    };
  }

  const { data: managedClient } = await supabase
    .from("agency_clients")
    .select("id, company_id")
    .eq("agency_user_id", userId)
    .eq("company_id", bid.company_id)
    .maybeSingle();

  if (!managedClient) {
    return null;
  }

  return {
    companyId: managedClient.company_id,
    agencyClientId: managedClient.id,
  };
}
