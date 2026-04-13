import { redirect } from "next/navigation";
import { getPreparationUsageSummary } from "@/lib/preparation-credits";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionClientPage } from "./subscription-client-page";

interface SubscriptionPageProps {
  searchParams?: Promise<{
    agencyClientId?: string;
  }>;
}

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedAgencyClientId = resolvedSearchParams?.agencyClientId ?? null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const status = await getSubscriptionStatus(user.id, user.email, supabase);

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  const primaryPreparationSummary = company
    ? {
        companyId: company.id,
        companyName: company.name,
        agencyClientId: null,
        summary: await getPreparationUsageSummary(supabase, {
          userId: user.id,
          companyId: company.id,
          plan: status.plan,
          subscription: status.subscription,
        }),
      }
    : null;

  let agencyPreparationAccounts: Array<{
    companyId: string;
    companyName: string;
    agencyClientId: string;
    summary: Awaited<ReturnType<typeof getPreparationUsageSummary>>;
  }> = [];

  if (status.plan.id === "agency") {
    const { data: agencyClients } = await supabase
      .from("agency_clients")
      .select(`
        id,
        company_id,
        companies (
          id,
          name
        )
      `)
      .eq("agency_user_id", user.id)
      .order("created_at", { ascending: false });

    agencyPreparationAccounts = await Promise.all(
      ((agencyClients ?? []) as Array<{
        id: string;
        company_id: string;
        companies: { id: string; name: string } | null;
      }>)
        .filter((item) => item.companies?.id && item.companies?.name)
        .map(async (item) => ({
          companyId: item.companies!.id,
          companyName: item.companies!.name,
          agencyClientId: item.id,
          summary: await getPreparationUsageSummary(supabase, {
            userId: user.id,
            companyId: item.companies!.id,
            plan: status.plan,
            subscription: status.subscription,
          }),
        })),
    );
  }

  return (
    <SubscriptionClientPage
      initialStatus={status}
      primaryPreparationSummary={primaryPreparationSummary}
      agencyPreparationAccounts={agencyPreparationAccounts}
      initialAgencyClientId={requestedAgencyClientId}
    />
  );
}
