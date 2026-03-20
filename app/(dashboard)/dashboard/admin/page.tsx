import { AdminDashboardOverview } from "@/components/admin/admin-dashboard-overview";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminDashboardData } from "@/lib/admin-dashboard";

export default async function AdminDashboardPage() {
  const user = await requireAdminUser();
  const data = await loadAdminDashboardData();

  return <AdminDashboardOverview data={data} adminEmail={user.email ?? "admin@mojaponuda.ba"} />;
}
