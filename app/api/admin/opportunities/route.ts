import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email?.toLowerCase() ?? "")) throw new Error("Forbidden");
  return user;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const type = url.searchParams.get("type") ?? "";

    const supabase = createAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("opportunities")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }
    if (status && ["active", "expired", "draft"].includes(status)) {
      query = query.eq("status", status as "active" | "expired" | "draft");
    }
    if (type && ["tender", "poticaj"].includes(type)) {
      query = query.eq("type", type as "tender" | "poticaj");
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      opportunities: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
