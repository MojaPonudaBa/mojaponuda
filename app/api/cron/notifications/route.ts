import { NextResponse } from "next/server";
import { runNotificationScheduler } from "@/lib/notifications/scheduler";

/**
 * Cron endpoint za obavještenja. Zovi jednom dnevno sa Vercel Cron-a ili
 * eksternog schedulera. Zaštićen je tokenom iz `CRON_SECRET`.
 *
 * Primjer Vercel crons.json:
 *   { "path": "/api/cron/notifications", "schedule": "0 5 * * *" }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("token");
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const result = await runNotificationScheduler();
  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - started,
    sent: result.sent,
    errors: result.errors,
  });
}
