import { redirect } from "next/navigation";

export default async function AgencyClientIntelligenceLayout({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/agency/clients/${id}/home`);
}
