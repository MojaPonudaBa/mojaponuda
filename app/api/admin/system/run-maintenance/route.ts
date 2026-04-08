import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { runAdminMaintenanceSweep } from "@/sync/ejn-sync";

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
      return NextResponse.json({ error: "Samo admin može pokrenuti maintenance." }, { status: 403 });
    }

    const result = await runAdminMaintenanceSweep();

    return NextResponse.json({
      status: result.status,
      duration_ms: result.duration_ms,
      total_updated: result.total_updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    const normalizedMessage = /timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(message)
      ? "Maintenance sweep je trajao predugo i server ga je prekinuo. Pokušaj ponovo za nekoliko minuta."
      : message;

    return NextResponse.json({ error: normalizedMessage }, { status: 500 });
  }
}
