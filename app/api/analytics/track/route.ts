import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      event: string;
      path: string;
      opportunity_id?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.event || !body.path) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const validEvents = ["view", "cta_click", "signup", "follow"];
    if (!validEvents.includes(body.event)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("page_analytics").insert({
      event: body.event,
      path: body.path,
      opportunity_id: body.opportunity_id ?? null,
      user_id: user?.id ?? null,
      metadata: body.metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
