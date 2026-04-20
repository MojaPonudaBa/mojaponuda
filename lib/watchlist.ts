/**
 * Watchlist — helper za dodavanje/uklanjanje naručilaca, CPV kodova i firmi.
 * Migracija: supabase/migrations/20260420_watchlist_and_notifications.sql
 */

import { createClient } from "@/lib/supabase/server";

export type WatchlistEntityType = "authority" | "cpv" | "company";

export interface WatchlistItem {
  id: string;
  user_id: string;
  company_id: string | null;
  entity_type: WatchlistEntityType;
  entity_key: string;
  entity_label: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  const supabase: AnyClient = await createClient();
  const { data } = await supabase
    .from("watchlist_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as WatchlistItem[];
}

export async function isWatched(
  userId: string,
  entityType: WatchlistEntityType,
  entityKey: string
): Promise<boolean> {
  const supabase: AnyClient = await createClient();
  const { data } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function addToWatchlist(params: {
  userId: string;
  companyId: string | null;
  entityType: WatchlistEntityType;
  entityKey: string;
  entityLabel?: string | null;
}): Promise<void> {
  const supabase: AnyClient = await createClient();
  await supabase
    .from("watchlist_items")
    .upsert(
      {
        user_id: params.userId,
        company_id: params.companyId,
        entity_type: params.entityType,
        entity_key: params.entityKey,
        entity_label: params.entityLabel ?? null,
      },
      { onConflict: "user_id,entity_type,entity_key" }
    );
}

export async function removeFromWatchlist(params: {
  userId: string;
  entityType: WatchlistEntityType;
  entityKey: string;
}): Promise<void> {
  const supabase: AnyClient = await createClient();
  await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", params.userId)
    .eq("entity_type", params.entityType)
    .eq("entity_key", params.entityKey);
}

/** Dohvati sve user-e koji prate određeni (type, key) — za slanje notifikacija. */
export async function findWatchersByEntity(
  entityType: WatchlistEntityType,
  entityKey: string
): Promise<{ user_id: string; entity_label: string | null }[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase: AnyClient = createAdminClient();
  const { data } = await supabase
    .from("watchlist_items")
    .select("user_id, entity_label")
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey);
  return data ?? [];
}
