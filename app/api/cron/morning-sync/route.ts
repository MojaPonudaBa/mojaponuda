import { NextRequest, NextResponse } from "next/server";
import { runMorningSyncAtSarajevo4AM } from "@/sync/ejn-sync";

export const maxDuration = 300;

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
    const result = await runMorningSyncAtSarajevo4AM();
    return NextResponse.json(result, {
      status: result.status === "skipped" ? 202 : result.status === "partial" ? 207 : 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Morning sync failed:", message);
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}
