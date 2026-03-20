import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
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

  const isAdmin = isAdminEmail(user.email);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f8fbff_12%,#f1f5f9_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(226,232,240,0.55)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.55)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_70%)]" />
      <div className="pointer-events-none absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[110px]" />
      <div className="pointer-events-none absolute left-[210px] top-24 h-[280px] w-[280px] rounded-full bg-slate-900/5 blur-[100px]" />
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
        isAdmin={isAdmin}
      />
      <main className="relative z-10 min-h-screen pl-[244px]">
        <div className="mx-auto min-h-screen w-full max-w-[1680px] px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
