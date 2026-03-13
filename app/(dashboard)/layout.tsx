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
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      {/* Full-height blue sidebar — no margin, no rounding */}
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
      />
      {/* White content panel with diagonal left edge overlapping sidebar */}
      <main className="relative z-10 min-h-screen pl-[120px] pr-3 pt-3 pb-3">
        <div className="relative min-h-[calc(100vh-24px)] overflow-visible rounded-[2rem] bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]">
          <div
            className="pointer-events-none absolute inset-y-0 -left-[72px] w-[96px] bg-white"
            style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
          />
          <div className="relative z-10 min-h-[calc(100vh-24px)] px-14 py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
