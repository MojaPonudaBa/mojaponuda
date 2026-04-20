"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EVENT_TYPES = new Set([
  "new_tender_watched_authority",
  "new_tender_watched_cpv",
  "bid_deadline_7d",
  "bid_deadline_2d",
  "vault_document_expires_30d",
  "vault_document_expires_7d",
  "competitor_downloaded_td",
]);

const ALLOWED_CHANNELS = new Set(["email", "in_app"]);

/**
 * Update jedne preference (event_type + channel). Koristi se kroz toggle matricu.
 */
export async function updateNotificationPreferenceAction(formData: FormData) {
  const eventType = String(formData.get("event_type") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (!ALLOWED_EVENT_TYPES.has(eventType) || !ALLOWED_CHANNELS.has(channel)) {
    throw new Error("Nevažeća preferenca.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niste prijavljeni.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySupabase = supabase as any;
  await anySupabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      event_type: eventType,
      channel,
      enabled,
    },
    { onConflict: "user_id,event_type,channel" }
  );

  revalidatePath("/dashboard/settings");
}
