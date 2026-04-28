import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOpportunityContent } from "@/sync/ai-content-generator";

export const maxDuration = 300;

/**
 * POST /api/admin/regen-content
 * Batch re-generates ai_content (and all AI fields) for published opportunities
 * that have ai_content = null. Call this after applying the DB migration.
 *
 * Optional body: { limit: number, id: string }
 * - limit: max rows to process (default 20)
 * - id: regenerate a specific opportunity by id
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit: number = body.limit ?? 20;
  const specificId: string | undefined = body.id;

  const adminDb = createAdminClient();

  let query = adminDb
    .from("opportunities")
    .select("id, title, issuer, description, requirements, value, deadline, type, location, eligibility_signals")
    .eq("published", true)
    .is("ai_content", null)
    .order("created_at", { ascending: false });

  if (specificId) {
    query = adminDb
      .from("opportunities")
      .select("id, title, issuer, description, requirements, value, deadline, type, location, eligibility_signals")
      .eq("id", specificId);
  } else {
    query = query.limit(limit);
  }

  const { data: rows, error: fetchError } = await query;

  if (fetchError) {
    if (fetchError.message?.includes("ai_content")) {
      return NextResponse.json({
        error: "Migration nije primijenjena. Pokreni SQL u Supabase: ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_content text;",
      }, { status: 400 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!rows?.length) {
    // Count total published posts to give context
    const { count } = await adminDb
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("published", true);
    return NextResponse.json({
      message: `Svi postovi već imaju automatski sadržaj. Ukupno objavljenih: ${count ?? 0}.`,
      processed: 0,
    });
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const aiContent = await generateOpportunityContent(
        row.title,
        row.issuer,
        row.description,
        row.requirements,
        row.value,
        row.deadline,
        row.type as "tender" | "poticaj",
        row.location,
        row.eligibility_signals,
      );

      if (!aiContent) {
        errors.push(`${row.id}: AI returned null`);
        failed++;
        continue;
      }

      const { error: updateError } = await adminDb
        .from("opportunities")
        .update({
          seo_title: aiContent.seo_title,
          seo_description: aiContent.seo_description,
          ai_summary: aiContent.ai_summary,
          ai_who_should_apply: aiContent.ai_who_should_apply,
          ai_difficulty: aiContent.ai_difficulty,
          ai_risks: aiContent.ai_risks,
          ai_competition: aiContent.ai_competition,
          ai_content: aiContent.ai_content,
          ai_generated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updateError) {
        errors.push(`${row.id}: ${updateError.message}`);
        failed++;
      } else {
        processed++;
      }
    } catch (err) {
      errors.push(`${row.id}: ${String(err)}`);
      failed++;
    }
  }

  return NextResponse.json({
    message: `Regenerated ${processed}/${rows.length} opportunities`,
    processed,
    failed,
    errors: errors.slice(0, 20),
  });
}
