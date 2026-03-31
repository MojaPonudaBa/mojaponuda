import { NextRequest, NextResponse } from "next/server";
import { runPostSyncPipeline } from "@/sync/post-sync-pipeline";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  try {
    const result = await runPostSyncPipeline();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Post-sync pipeline failed:", message);
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
