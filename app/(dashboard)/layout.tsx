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
    .single();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="flex h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] w-full max-w-[1600px] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-blue-900/5 ring-1 ring-slate-200/50">
        <DashboardSidebar
          userEmail={user.email ?? ""}
          companyName={company?.name}
        />
        <main className="flex-1 overflow-auto bg-slate-50/50 relative">
          <div className="mx-auto h-full max-w-7xl p-6 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
