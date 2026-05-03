import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getSubscriptionStatus } from "@/lib/subscription";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import type { AgencyClientNavItem } from "@/components/dashboard-sidebar";
import { DashboardAssistantProvider } from "@/components/dashboard/dashboard-assistant-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = isAdminEmail(user.email);
  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = plan.id === "agency";

  // Fetch agency clients for sidebar navigation
  let agencyClients: AgencyClientNavItem[] = [];
  if (isAgency) {
    const { data: agencyData } = await supabase
      .from("agency_clients")
      .select("id, companies (name)")
      .eq("agency_user_id", user.id)
      .order("created_at", { ascending: false });

    agencyClients = (agencyData ?? [])
      .map((row) => {
        const companies = row.companies as { name: string } | null;
        return {
          id: row.id,
          name: companies?.name ?? "Nepoznat klijent",
        };
      });
  }

  return (
    <div className="dashboard-shell min-h-screen overflow-x-hidden bg-[#f7f9fc]">
      <style>{`@media (min-width: 1024px){html[data-dashboard-sidebar="collapsed"] .dashboard-main{padding-left:84px}}`}</style>
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
        isAdmin={isAdmin}
        isAgency={isAgency}
        agencyClients={agencyClients}
      />
      <main className="dashboard-main min-h-screen min-w-0 pb-20 pt-[4.75rem] transition-[padding] lg:pb-0 lg:pl-[244px] lg:pt-0">
        <DashboardAssistantProvider userEmail={user.email ?? ""} companyName={company?.name} />
        <div className="mx-auto min-h-screen w-full max-w-[1720px] px-4 py-5 sm:px-6 lg:px-7 xl:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
