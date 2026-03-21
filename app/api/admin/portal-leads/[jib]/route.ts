import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { loadAdminPortalLeadsData, type AdminLeadOutreachStatus } from "@/lib/admin-portal-leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    jib: string;
  }>;
}

function normalizeJib(value: string): string {
  return value.replace(/\D/g, "").trim();
}

function isOutreachStatus(value: string): value is AdminLeadOutreachStatus {
  return ["new", "contacted", "converted", "dead", "nije_kontaktiran", "u_toku", "kontaktiran", "pauza"].includes(value);
}

function normalizeStatus(value: string | undefined): AdminLeadOutreachStatus {
  switch ((value ?? "").trim().toLowerCase()) {
    case "contacted":
    case "kontaktiran":
    case "u_toku":
      return "contacted";
    case "converted":
    case "konvertovan":
      return "converted";
    case "dead":
    case "mrtav":
    case "pauza":
      return "dead";
    default:
      return "new";
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Morate biti prijavljeni." }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Samo admin može uređivati portal leadove." }, { status: 403 });
    }

    const { jib } = await context.params;
    const normalizedJib = normalizeJib(decodeURIComponent(jib));

    if (!normalizedJib) {
      return NextResponse.json({ error: "Nedostaje ispravan JIB lead-a." }, { status: 400 });
    }

    const body = (await request.json()) as {
      leadName?: string;
      note?: string;
      status?: string;
      outreachStatus?: string;
      lastContactedAt?: string | null;
      nextFollowUpAt?: string | null;
    };

    if (!body.leadName?.trim()) {
      return NextResponse.json({ error: "Nedostaje naziv firme za lead." }, { status: 400 });
    }

    const rawStatus = body.status ?? body.outreachStatus ?? "";
    const outreachStatus = isOutreachStatus(rawStatus)
      ? normalizeStatus(rawStatus)
      : "new";

    const admin = createAdminClient();
    const { error } = await admin.from("admin_portal_lead_notes").upsert(
      {
        lead_jib: normalizedJib,
        lead_name: body.leadName.trim(),
        note: body.note?.trim() || null,
        outreach_status: outreachStatus,
        last_contacted_at: body.lastContactedAt ?? null,
        next_follow_up_at: body.nextFollowUpAt ?? null,
        updated_by: user.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_jib" }
    );

    if (error) {
      return NextResponse.json({ error: `Ne mogu sačuvati bilješke: ${error.message}` }, { status: 500 });
    }

    const data = await loadAdminPortalLeadsData();
    const lead = data.leads.find((item) => item.jib === normalizedJib);

    if (!lead) {
      return NextResponse.json({ error: "Lead je sačuvan, ali ga ne mogu ponovo učitati." }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
