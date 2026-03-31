import { NextRequest, NextResponse } from "next/server";
import { runPostSyncPipeline } from "@/sync/post-sync-pipeline";
import type { ExecutionLayer } from "@/sync/scrapers/scraper-orchestrator";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  try {
    // Get execution layer from query parameter (default: layer1)
    const { searchParams } = new URL(request.url);
    const layerParam = searchParams.get("layer") || "layer1";
    
    // Validate layer parameter
    const validLayers: ExecutionLayer[] = ["layer1", "layer2", "layer3"];
    const layer: ExecutionLayer = validLayers.includes(layerParam as ExecutionLayer) 
      ? (layerParam as ExecutionLayer) 
      : "layer1";

    const result = await runPostSyncPipeline(layer);
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Post-sync pipeline failed:", message);
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
