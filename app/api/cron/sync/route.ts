import { NextRequest, NextResponse } from "next/server";
import { runFullSync } from "@/sync/ejn-sync";

export const maxDuration = 300; // 5 min za Vercel Pro

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: "Neautorizovan pristup." },
      { status: 401 }
    );
  }

  try {
    const { results, duration_ms } = await runFullSync();

    const hasErrors = results.some((r) => r.error);
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

    return NextResponse.json({
      status: hasErrors ? "partial" : "ok",
      duration_ms,
      total_added: totalAdded,
      total_updated: totalUpdated,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sync failed:", message);
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}
