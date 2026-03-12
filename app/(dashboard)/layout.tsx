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
    <div className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Soft background glows to match the reference aesthetic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-blue-300/20 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative flex h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] w-full max-w-[1600px] overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_-15px_rgba(37,99,235,0.15)] ring-1 ring-slate-200/50">
        <DashboardSidebar
          userEmail={user.email ?? ""}
          companyName={company?.name}
        />
        <main className="flex-1 overflow-auto bg-slate-50/30 relative">
          <div className="mx-auto h-full max-w-7xl p-6 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
