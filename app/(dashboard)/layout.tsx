import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#eef3fb_0%,#f8fafc_22%,#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[420px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_55%)]" />
      <div className="pointer-events-none absolute right-[-120px] top-[-120px] size-[420px] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.18),transparent_65%)] blur-3xl" />
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
      />
      <main className="relative min-h-screen bg-slate-50/50 pl-[220px]">
        <div className="min-h-screen w-full px-8 py-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
