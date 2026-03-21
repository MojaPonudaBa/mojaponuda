import { AdminLeadsMinimalShell } from "@/components/admin/admin-leads-minimal-shell";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminPortalLeadsData } from "@/lib/admin-portal-leads";

export default async function AdminPortalLeadsPage() {
  const user = await requireAdminUser();
  const data = await loadAdminPortalLeadsData();

  return <AdminLeadsMinimalShell data={data} adminEmail={user.email ?? "admin@mojaponuda.ba"} />;
}
