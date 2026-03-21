import { AdminSystemShell } from "@/components/admin/admin-system-shell";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminSystemData } from "@/lib/admin-operator";

export default async function AdminSystemPage() {
  await requireAdminUser();
  const data = await loadAdminSystemData();

  return <AdminSystemShell data={data} />;
}
