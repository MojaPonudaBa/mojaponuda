/**
 * Notification dispatch modul.
 *
 * Trenutno: LOGIRA email u konzolu umjesto slanja. Kasnije zamijeniti
 * blok označen `// TODO(resend):` pozivom `resend.emails.send({...})`.
 *
 * Sve pozive rade kroz `sendNotification(...)` koji:
 *   1) provjerava user preference (tip događaja on/off),
 *   2) upsertuje red u `public.notifications` (dedup po event_type + dedup_key),
 *   3) logira ispis u konzolu (ili bi zvao Resend),
 *   4) markira `delivered_at` na uspjeh.
 *
 * Za dedup, koristimo kombinovani ključ koji je stabilan po događaju:
 *   - 'new_tender_watched_authority' / 'new_tender_watched_cpv' → tenderId
 *   - 'competitor_downloaded_td'                                → `${competitorJib}:${tenderId}`
 *   - 'bid_deadline_7d' / 'bid_deadline_2d'                     → `${bidId}:${variant}`
 *   - 'vault_document_expires_*'                                → `${documentId}:${variant}`
 */

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lokalni cast jer `notification_preferences` / `notifications` nisu još
 * u generiranim tipovima (migracija 20260420_watchlist_and_notifications).
 * Zamijeniti s pravim tipovima nakon `supabase gen types`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export type NotificationEventType =
  | "new_tender_watched_authority"
  | "new_tender_watched_cpv"
  | "competitor_downloaded_td"
  | "bid_deadline_7d"
  | "bid_deadline_2d"
  | "vault_document_expires_30d"
  | "vault_document_expires_7d";

export interface SendNotificationInput {
  userId: string;
  eventType: NotificationEventType;
  dedupKey: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  payload?: Record<string, unknown>;
  /**
   * Email adresa primaoca. Ako nije data, fetch iz auth.users.
   * U placeholder režimu samo se logira.
   */
  toEmail?: string;
}

export interface SendNotificationResult {
  skipped?: "disabled_by_user" | "already_sent";
  notificationId?: string;
  delivered?: boolean;
}

async function isEventEnabled(
  supabase: AnyClient,
  userId: string,
  eventType: NotificationEventType
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .maybeSingle();

  // Default: uključeno ako nema zapisa.
  return data?.enabled !== false;
}

export async function sendNotification(
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  const supabase: AnyClient = createAdminClient();

  if (!(await isEventEnabled(supabase, input.userId, input.eventType))) {
    return { skipped: "disabled_by_user" };
  }

  // Upsert za dedup; ako već postoji za isti (user, event, dedup_key) preskačemo.
  const { data: existing } = await supabase
    .from("notifications")
    .select("id, delivered_at")
    .eq("user_id", input.userId)
    .eq("event_type", input.eventType)
    .eq("dedup_key", input.dedupKey)
    .maybeSingle();

  if (existing?.delivered_at) {
    return { skipped: "already_sent", notificationId: existing.id };
  }

  let notificationId = existing?.id;
  if (!notificationId) {
    const { data: inserted, error } = await supabase
      .from("notifications")
      .insert({
        user_id: input.userId,
        event_type: input.eventType,
        dedup_key: input.dedupKey,
        subject: input.subject,
        body_text: input.bodyText,
        body_html: input.bodyHtml ?? null,
        payload: input.payload ?? null,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("[notifications] insert failed", error);
      return { delivered: false };
    }
    notificationId = inserted.id;
  }

  // ─── PLACEHOLDER: logiraj umjesto slanja ─────────────────────────────
  console.log(
    "[notifications:PLACEHOLDER] →",
    JSON.stringify(
      {
        to: input.toEmail ?? `<user:${input.userId}>`,
        event: input.eventType,
        dedup: input.dedupKey,
        subject: input.subject,
      },
      null,
      2
    )
  );
  console.log("   body:", input.bodyText);

  // TODO(resend): zamijeniti blok iznad sa stvarnim pozivom:
  //
  //   import { Resend } from "resend";
  //   const resend = new Resend(process.env.RESEND_API_KEY!);
  //   const { error: emailError } = await resend.emails.send({
  //     from: "TenderSistem <obavijesti@tendersistem.com>",
  //     to: input.toEmail!,
  //     subject: input.subject,
  //     text: input.bodyText,
  //     html: input.bodyHtml,
  //   });
  //   if (emailError) { return { delivered: false }; }
  // ─────────────────────────────────────────────────────────────────────

  await supabase
    .from("notifications")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", notificationId);

  return { delivered: true, notificationId };
}

/** Pomoćni pluralizator za BHS jezik (1/2-4/5+). */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
