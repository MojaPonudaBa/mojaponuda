import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildCompanyProfileEmbeddingText,
  generateEmbedding,
  toPgVector,
} from "@/lib/embeddings";

export const maxDuration = 30;

/**
 * Computes profile_embedding from the 5 onboarding fields + category text,
 * then upserts (profile_text, profile_embedding, profile_embedded_at) on the
 * user's company row. Must complete before the preview step so that the
 * recommendation pipeline has a vector to query with.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      description?: string;
      pastClients?: string | null;
      licenses?: string | null;
      notOffered?: string | null;
      regionsText?: string | null;
      categoryText?: string | null;
      companyId?: string | null;
    };

    const description = (body.description ?? "").trim();
    if (description.length < 10) {
      return NextResponse.json(
        { error: "Opis djelatnosti mora imati barem 10 karaktera." },
        { status: 400 }
      );
    }

    const profileText = buildCompanyProfileEmbeddingText({
      description,
      pastClients: body.pastClients ?? null,
      licenses: body.licenses ?? null,
      notOffered: body.notOffered ?? null,
      regionsText: body.regionsText ?? null,
      categoryText: body.categoryText ?? null,
    });

    const embedding = await generateEmbedding(profileText);
    const vec = toPgVector(embedding);

    // Locate or create the company row
    let companyId = body.companyId ?? null;
    if (!companyId) {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      companyId = existing?.id ?? null;
    }

    const payload = {
      profile_text: profileText,
      profile_embedding: vec,
      profile_embedded_at: new Date().toISOString(),
    };

    if (companyId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("companies")
        .update(payload)
        .eq("id", companyId);
      if (error) throw error;

      // Purge stale LLM relevance cache for this company — the embedding has
      // changed so previous scores may no longer reflect the company's real
      // fit. Next /dashboard/tenders?tab=recommended render will re-score.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: purgeErr } = await (supabase as any)
        .from("tender_relevance")
        .delete()
        .eq("company_id", companyId);
      if (purgeErr) {
        console.warn("save-embedding: could not purge tender_relevance cache:", purgeErr.message);
      }

      return NextResponse.json({
        ok: true,
        companyId,
        deferred: false,
        profileTextLength: profileText.length,
        embeddingDims: embedding.length,
      });
    }

    // No company row yet — defer the DB write until final onboarding submit,
    // which provides required NOT NULL fields (name, jib). Return the computed
    // values so the client can include them in the final insert payload.
    return NextResponse.json({
      ok: true,
      companyId: null,
      deferred: true,
      profileText,
      profileEmbedding: vec,
      profileTextLength: profileText.length,
      embeddingDims: embedding.length,
    });
  } catch (err) {
    console.error("save-embedding error:", err);
    return NextResponse.json(
      {
        error: "Greška prilikom spremanja profila za preporuke.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
