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

function normalizeCpvPrefix(value: unknown): string {
  return String(value ?? "").replace(/[^0-9]/g, "").slice(0, 3);
}

function nestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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
  const nowIso = now.toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  const errors: string[] = [];

  // ── 1) Novi tenderi za praćene autoritete ───────────────────────────
  try {
    const { data: newTenders } = await supabase
      .from("tenders")
      .select("id, title, contracting_authority, contracting_authority_jib, cpv_code, deadline")
      .gte("created_at", yesterday)
      .lte("created_at", nowIso);

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
      const prefix = normalizeCpvPrefix(t.cpv_code);
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

  // Rani signali iz planova nabavki za pracene narucioce i CPV kategorije.
  try {
    const { data: planned } = await supabase
      .from("planned_procurements")
      .select("id, description, planned_date, estimated_value, contract_type, cpv_code, contracting_authorities(name, jib)")
      .gte("created_at", yesterday)
      .lte("created_at", nowIso)
      .limit(500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const plan of (planned ?? []) as any[]) {
      const authority = nestedOne(plan.contracting_authorities);
      const authorityJib = authority?.jib ?? null;
      const title = plan.description ?? "Planirana nabavka";
      const valueText = plan.estimated_value ? `\nProcjena: ${Number(plan.estimated_value).toLocaleString("bs-BA")} KM` : "";
      const dateText = plan.planned_date ? `\nPlanirano: ${new Date(plan.planned_date).toLocaleDateString("bs-BA")}` : "";
      const plannedWhy = plan.planned_date
        ? "Rani signal: mozete pripremiti dokumente i cijenu prije objave tendera."
        : "Rani signal: ovaj narucilac je najavio nabavku iz pracenog podrucja.";

      if (authorityJib) {
        const { data: watchers } = await supabase
          .from("watchlist_items")
          .select("user_id")
          .eq("entity_type", "authority")
          .eq("entity_key", authorityJib);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const w of (watchers ?? []) as any[]) {
          const email = await getUserEmail(supabase, w.user_id);
          const res = await sendNotification({
            userId: w.user_id,
            eventType: "planned_procurement_watched_authority",
            dedupKey: plan.id,
            subject: `Rani signal: ${title}`,
            bodyText: `${authority?.name ?? "Praceni narucilac"} ima novu planiranu nabavku:\n\n${title}${dateText}${valueText}`,
            payload: {
              plannedProcurementId: plan.id,
              authorityJib,
              importance: "medium",
              why: plannedWhy,
            },
            toEmail: email,
          });
          if (res.delivered) sent++;
        }
      }

      const prefix = normalizeCpvPrefix(plan.cpv_code);
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
            eventType: "planned_procurement_watched_cpv",
            dedupKey: plan.id,
            subject: `Planirana nabavka u CPV ${prefix}`,
            bodyText: `${title}\n\nNarucilac: ${authority?.name ?? "-"}${dateText}${valueText}`,
            payload: {
              plannedProcurementId: plan.id,
              cpvPrefix: prefix,
              importance: "medium",
              why: plannedWhy,
            },
            toEmail: email,
          });
          if (res.delivered) sent++;
        }
      }
    }
  } catch (e) {
    errors.push(`planned_procurements: ${(e as Error).message}`);
  }

  // Nove pobjede pracenih konkurenata.
  try {
    const { data: awards } = await supabase
      .from("award_decisions")
      .select("portal_award_id, winner_name, winner_jib, winning_price, award_date, contract_type, contracting_authority_jib")
      .gte("created_at", yesterday)
      .lte("created_at", nowIso)
      .not("winner_jib", "is", null)
      .limit(500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const award of (awards ?? []) as any[]) {
      const { data: watchers } = await supabase
        .from("watchlist_items")
        .select("user_id")
        .eq("entity_type", "company")
        .eq("entity_key", award.winner_jib);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const w of (watchers ?? []) as any[]) {
        const email = await getUserEmail(supabase, w.user_id);
        const priceText = award.winning_price ? `${Number(award.winning_price).toLocaleString("bs-BA")} KM` : "vrijednost nije objavljena";
        const awardWhy = award.contracting_authority_jib
          ? "Konkurent je dobio novi ugovor kod narucioca koji moze biti relevantan za vase buduce ponude."
          : "Praceni konkurent je aktivan; provjerite kategoriju i tip ugovora.";
        const res = await sendNotification({
          userId: w.user_id,
          eventType: "competitor_new_award",
          dedupKey: award.portal_award_id,
          subject: `Konkurent dobio ugovor: ${award.winner_name ?? award.winner_jib}`,
          bodyText: `${award.winner_name ?? award.winner_jib} je dobio novi ugovor (${priceText}).\nKategorija: ${award.contract_type ?? "-"}\nDatum: ${award.award_date ?? "-"}`,
          payload: {
            awardId: award.portal_award_id,
            competitorJib: award.winner_jib,
            authorityJib: award.contracting_authority_jib,
            importance: "high",
            why: awardWhy,
          },
          toEmail: email,
        });
        if (res.delivered) sent++;
      }
    }
  } catch (e) {
    errors.push(`competitor_awards: ${(e as Error).message}`);
  }

  // Novi decision signali za preporucene tendere.
  try {
    const { data: decisions } = await supabase
      .from("tender_decision_insights")
      .select("company_id, tender_id, recommendation, risk_level, priority_score, match_score, win_probability, data_quality, tenders(title, deadline, contracting_authority), companies(user_id, name)")
      .gte("computed_at", yesterday)
      .lte("computed_at", nowIso)
      .gte("match_score", 60)
      .limit(1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const decision of (decisions ?? []) as any[]) {
      const company = nestedOne(decision.companies);
      const tender = nestedOne(decision.tenders);
      const userId = company?.user_id;
      if (!userId || !tender?.title) continue;

      const email = await getUserEmail(supabase, userId);
      const due = tender.deadline ? new Date(tender.deadline).toLocaleDateString("bs-BA") : "-";

      if (decision.priority_score >= 70 && decision.recommendation === "bid" && decision.risk_level !== "high") {
        const res = await sendNotification({
          userId,
          eventType: "decision_recommended_bid",
          dedupKey: `${decision.company_id}:${decision.tender_id}:priority`,
          subject: `Vrijedi pregledati: ${tender.title}`,
          bodyText: `${tender.title}\nNaručilac: ${tender.contracting_authority ?? "-"}\nUsklađenost: ${decision.match_score}%\nRok: ${due}`,
          payload: {
            tenderId: decision.tender_id,
            companyId: decision.company_id,
            importance: "high",
            why: "Visoka usklađenost i prioritet: otvorite tender dok ima vremena za pripremu.",
          },
          toEmail: email,
        });
        if (res.delivered) sent++;
      }

      if (decision.risk_level === "high") {
        const res = await sendNotification({
          userId,
          eventType: "decision_high_risk",
          dedupKey: `${decision.company_id}:${decision.tender_id}:risk`,
          subject: `Rizik u preporučenom tenderu: ${tender.title}`,
          bodyText: `${tender.title}\nSistem odluke označio je visok rizik. Provjerite uslove, rok i cijenu prije ulaska u pripremu.`,
          payload: {
            tenderId: decision.tender_id,
            companyId: decision.company_id,
            importance: "high",
            why: "Rizik je visok: provjerite uslove, konkurenciju i cijenu prije ulaganja vremena.",
          },
          toEmail: email,
        });
        if (res.delivered) sent++;
      }
    }
  } catch (e) {
    errors.push(`decision_signals: ${(e as Error).message}`);
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
