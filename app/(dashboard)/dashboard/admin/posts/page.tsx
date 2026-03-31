import { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin";
import { AdminPostsManager } from "@/components/admin/admin-posts-manager";

export const metadata: Metadata = {
  title: "Upravljanje postovima | Admin",
};

export default async function AdminPostsPage() {
  await requireAdminUser();
  return <AdminPostsManager />;
}
