import { AdminFinancialsShell } from "@/components/admin/admin-financials-shell";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminFinancialsData } from "@/lib/admin-operator";

export default async function AdminFinancialsPage() {
  await requireAdminUser();
  const data = await loadAdminFinancialsData();

  return <AdminFinancialsShell data={data} />;
}
