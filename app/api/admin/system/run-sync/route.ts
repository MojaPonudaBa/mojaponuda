import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { runAdminPortalSync } from "@/sync/ejn-sync";

export const maxDuration = 300;

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Morate biti prijavljeni." }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Samo admin može pokrenuti sync." }, { status: 403 });
    }

    const result = await runAdminPortalSync();

    return NextResponse.json({
      status: result.status,
      duration_ms: result.duration_ms,
      total_added: result.total_added,
      total_updated: result.total_updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    const normalizedMessage = /timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(message)
      ? "Portal sync je trajao predugo i server ga je prekinuo. Pokušaj ponovo za nekoliko minuta ili provjeri server log ako se problem ponavlja."
      : message;

    return NextResponse.json({ error: normalizedMessage }, { status: 500 });
  }
}
