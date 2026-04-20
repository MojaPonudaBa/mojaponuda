"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addToWatchlist,
  removeFromWatchlist,
  type WatchlistEntityType,
} from "@/lib/watchlist";

async function resolveUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { userId: user.id, companyId: company?.id ?? null };
}

export async function watchEntityAction(formData: FormData) {
  const entityType = formData.get("entity_type") as WatchlistEntityType;
  const entityKey = String(formData.get("entity_key") ?? "");
  const entityLabel = formData.get("entity_label")?.toString() ?? null;
  const redirectTo = formData.get("redirect_to")?.toString() ?? null;

  if (!entityType || !entityKey) return;

  const { userId, companyId } = await resolveUser();
  await addToWatchlist({
    userId,
    companyId,
    entityType,
    entityKey,
    entityLabel,
  });

  if (redirectTo) revalidatePath(redirectTo);
  revalidatePath("/dashboard/watchlist");
}

export async function unwatchEntityAction(formData: FormData) {
  const entityType = formData.get("entity_type") as WatchlistEntityType;
  const entityKey = String(formData.get("entity_key") ?? "");
  const redirectTo = formData.get("redirect_to")?.toString() ?? null;

  if (!entityType || !entityKey) return;

  const { userId } = await resolveUser();
  await removeFromWatchlist({ userId, entityType, entityKey });

  if (redirectTo) revalidatePath(redirectTo);
  revalidatePath("/dashboard/watchlist");
}
