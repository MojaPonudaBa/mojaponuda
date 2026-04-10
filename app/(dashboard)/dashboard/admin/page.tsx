import { AdminDashboardOverview } from "@/components/admin/admin-dashboard-overview";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminOverviewData } from "@/lib/admin-operator";

export default async function AdminDashboardPage() {
  const user = await requireAdminUser();
  const data = await loadAdminOverviewData();

  return <AdminDashboardOverview data={data} adminEmail={user.email ?? "admin@tendersistem.com"} />;
}

