/**
 * Notification scheduler — pokreće se preko internog cron/api routea (npr.
 * /api/cron/notifications ili iz postojećeg 4:00 UTC sinhronizacijskog job-a).
 *
 * Obradjuje:
 *   1) Nove tendere za pracene naručioce (entity_type='authority')
 *   2) Nove tendere u pracenim CPV kategorijama (entity_type='cpv')
 *   3) Bid rokovi 7d / 2d prije submission_deadline
 *   4) Vault dokumenti istek 30d / 7d
 *   5) (TODO) Pracenje konkurent preuzeo TD — čim podatak bude dostupan iz API-ja
 *
 * Svaki `sendNotification` poziv dedup-uje kroz `notifications` tabelu, pa
 * je siguran za višestruke pozive u istom danu.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/send";

function startOfDayIso(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

async function getUserEmail(supabase: AnyClient, userId: string): Promise<string | undefined> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email ?? undefined;
}

export async function runNotificationScheduler() {
  const supabase: AnyClient = createAdminClient();
  const now = new Date();
  const today = startOfDayIso(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  const errors: string[] = [];

  // ── 1) Novi tenderi za praćene autoritete ───────────────────────────
  try {
    const { data: newTenders } = await supabase
      .from("tenders")
      .select("id, title, contracting_authority, contracting_authority_jib, cpv_code, deadline")
      .gte("created_at", yesterday)
      .lt("created_at", today);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of (newTenders ?? []) as any[]) {
      if (!t.contracting_authority_jib) continue;
      const { data: watchers } = await supabase
        .from("watchlist_items")
        .select("user_id, entity_label")
        .eq("entity_type", "authority")
        .eq("entity_key", t.contracting_authority_jib);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const w of (watchers ?? []) as any[]) {
        const email = await getUserEmail(supabase, w.user_id);
        const res = await sendNotification({
          userId: w.user_id,
          eventType: "new_tender_watched_authority",
          dedupKey: t.id,
          subject: `Novi tender: ${t.title}`,
          bodyText: `Naručilac ${t.contracting_authority} koji pratite objavio je novi tender:\n\n${t.title}\n\nRok za ponude: ${t.deadline ?? "—"}`,
          payload: { tenderId: t.id },
          toEmail: email,
        });
        if (res.delivered) sent++;
      }

      // CPV match (3-digit prefix)
      const prefix = (t.cpv_code ?? "").toString().replace(/[^0-9]/g, "").slice(0, 3);
      if (prefix) {
        const { data: cpvWatchers } = await supabase
          .from("watchlist_items")
          .select("user_id")
          .eq("entity_type", "cpv")
          .eq("entity_key", prefix);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const w of (cpvWatchers ?? []) as any[]) {
          const email = await getUserEmail(supabase, w.user_id);
          const res = await sendNotification({
            userId: w.user_id,
            eventType: "new_tender_watched_cpv",
            dedupKey: t.id,
            subject: `Novi tender u praćenoj kategoriji CPV ${prefix}`,
            bodyText: `${t.title}\n\nNaručilac: ${t.contracting_authority ?? "—"}\nRok: ${t.deadline ?? "—"}`,
            payload: { tenderId: t.id, cpvPrefix: prefix },
            toEmail: email,
          });
          if (res.delivered) sent++;
        }
      }
    }
  } catch (e) {
    errors.push(`new_tenders: ${(e as Error).message}`);
  }

  // ── 2) Bid rokovi 7d / 2d ───────────────────────────────────────────
  try {
    const { data: bids } = await supabase
      .from("bids")
      .select("id, submission_deadline, tenders(title), companies(user_id)")
      .in("status", ["draft", "in_review"])
      .not("submission_deadline", "is", null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const b of (bids ?? []) as any[]) {
      const deadline = new Date(b.submission_deadline);
      const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const userId = Array.isArray(b.companies) ? b.companies[0]?.user_id : b.companies?.user_id;
      if (!userId) continue;
      const t = Array.isArray(b.tenders) ? b.tenders[0] : b.tenders;
      const email = await getUserEmail(supabase, userId);
      if (days === 7 || days === 2) {
        const eventType = days === 7 ? "bid_deadline_7d" : "bid_deadline_2d";
        const res = await sendNotification({
          userId,
          eventType,
          dedupKey: `${b.id}:${days}d`,
          subject: `Rok za ponudu za ${days} dana: ${t?.title ?? "vaš projekat"}`,
          bodyText: `Podsjetnik: predaja ponude za "${t?.title ?? ""}" je ${deadline.toLocaleDateString("bs-BA")}.`,
          payload: { bidId: b.id, days },
          toEmail: email,
        });
        if (res.delivered) sent++;
      }
    }
  } catch (e) {
    errors.push(`bid_deadlines: ${(e as Error).message}`);
  }

  // ── 3) Vault dokumenti istek 30d / 7d ───────────────────────────────
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, name, expires_at, company_id, companies(user_id)")
      .not("expires_at", "is", null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const d of (docs ?? []) as any[]) {
      const expires = new Date(d.expires_at);
      const days = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const userId = Array.isArray(d.companies) ? d.companies[0]?.user_id : d.companies?.user_id;
      if (!userId) continue;
      if (days === 30 || days === 7) {
        const eventType = days === 30 ? "vault_document_expires_30d" : "vault_document_expires_7d";
        const email = await getUserEmail(supabase, userId);
        const res = await sendNotification({
          userId,
          eventType,
          dedupKey: `${d.id}:${days}d`,
          subject: `Dokument "${d.name}" ističe za ${days} dana`,
          bodyText: `Vaš dokument "${d.name}" ističe ${expires.toLocaleDateString("bs-BA")}. Pripremite obnovu na vrijeme.`,
          payload: { documentId: d.id, days },
          toEmail: email,
        });
        if (res.delivered) sent++;
      }
    }
  } catch (e) {
    errors.push(`vault_expiry: ${(e as Error).message}`);
  }

  return { sent, errors };
}
