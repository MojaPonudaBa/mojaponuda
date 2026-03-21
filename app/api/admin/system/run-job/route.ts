import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_MANUAL_SYNC_ENDPOINTS,
  runManualSyncJob,
  type AdminManualSyncEndpoint,
} from "@/sync/ejn-sync";

export const maxDuration = 300;

function normalizeManualSyncError(message: string): string {
  if (/timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(message)) {
    return "Ovaj sync je trajao predugo i server ga je prekinuo. Pokušaj ponovo za nekoliko minuta ili provjeri server log ako se problem ponavlja.";
  }

  if (/deployment/i.test(message)) {
    return "Server nije korektno vratio rezultat ovog sync joba. Pokušaj ponovo, a ako se problem ponovi provjeri deployment log.";
  }

  return message;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Morate biti prijavljeni." }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Samo admin može pokrenuti sync job." }, { status: 403 });
    }

    const body = (await request.json()) as { endpoint?: string };
    const endpoint = body.endpoint;

    if (!endpoint || !ADMIN_MANUAL_SYNC_ENDPOINTS.includes(endpoint as AdminManualSyncEndpoint)) {
      return NextResponse.json({ error: "Nepoznat ili nepodržan sync job." }, { status: 400 });
    }

    const result = await runManualSyncJob(endpoint as AdminManualSyncEndpoint);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    return NextResponse.json({ error: normalizeManualSyncError(message) }, { status: 500 });
  }
}
