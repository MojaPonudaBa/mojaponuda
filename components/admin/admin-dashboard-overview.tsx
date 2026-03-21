import { AdminOverviewShell } from "@/components/admin/admin-overview-shell";
import type { AdminOverviewData } from "@/lib/admin-operator";

interface AdminDashboardOverviewProps {
  data: AdminOverviewData;
  adminEmail: string;
}

export function AdminDashboardOverview({ data, adminEmail }: AdminDashboardOverviewProps) {
  return <AdminOverviewShell data={data} adminEmail={adminEmail} />;
}
