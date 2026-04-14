import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getSubscriptionStatus } from "@/lib/subscription";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import type { AgencyClientNavItem } from "@/components/dashboard-sidebar";

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
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.09),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f3f7fb_42%,#eef3f8_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:radial-gradient(circle_at_top_left,#000_18%,transparent_78%)]" />
      <div className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute left-[220px] top-24 h-[320px] w-[320px] rounded-full bg-sky-300/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[260px] w-[260px] rounded-full bg-slate-900/5 blur-[120px]" />
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
        isAdmin={isAdmin}
        isAgency={isAgency}
        agencyClients={agencyClients}
      />
      <main className="relative z-10 min-h-screen pl-[244px]">
        <div className="mx-auto min-h-screen w-full max-w-[1760px] px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 xl:px-14 xl:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
