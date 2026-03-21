import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { runFullSync } from "@/sync/ejn-sync";

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

    const { results, duration_ms } = await runFullSync();
    const hasErrors = results.some((result) => result.error);
    const totalAdded = results.reduce((sum, result) => sum + result.added, 0);
    const totalUpdated = results.reduce((sum, result) => sum + result.updated, 0);

    return NextResponse.json({
      status: hasErrors ? "partial" : "ok",
      duration_ms,
      total_added: totalAdded,
      total_updated: totalUpdated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
