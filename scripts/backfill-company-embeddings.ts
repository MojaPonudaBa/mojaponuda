/**
 * Backfill profile_embedding for every company.user that doesn't have one yet.
 * Synthesises a profile_text from:
 *   (a) structured industry JSON (companyDescription, pastClients, licenses, notOffered, offeringCategories)
 *   (b) legacy industry text, if present
 *   (c) keywords[], operating_regions[] as additional context
 *
 * Also purges tender_relevance cache for each updated company so the next
 * Preporuceno render re-scores fresh.
 *
 * Does NOT import lib/ (server-only guard).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_INPUT_CHARS = 8000;

const OFFERING_LABELS: Record<string, string> = {
  software_licenses: "Softver i licence",
  it_hardware: "IT oprema i mreže",
  telecom_av: "Telekomunikacije i audio-video sistemi",
  cloud_cyber_data: "Cloud, cyber sigurnost i podaci",
  civil_works: "Građevinski radovi",
  electrical_works: "Elektroradovi",
  mechanical_works: "Mašinski radovi",
  road_works: "Cestogradnja i infrastruktura",
  services: "Stručne i savjetodavne usluge",
  maintenance: "Održavanje i servis",
  transport_logistics: "Transport i logistika",
  medical_goods: "Medicinska oprema i potrošni materijal",
  office_goods: "Kancelarijski materijal i oprema",
  food_goods: "Hrana i piće",
  cleaning_goods: "Sredstva za čišćenje i higijenu",
  vehicles: "Vozila i dijelovi",
  fuels_energy: "Gorivo i energija",
};

function labelFor(id: string): string {
  return OFFERING_LABELS[id] ?? id;
}

interface StructuredProfile {
  version?: number;
  primaryIndustry?: string | null;
  offeringCategories?: string[];
  specializationIds?: string[];
  preferredTenderTypes?: string[];
  companyDescription?: string | null;
  pastClients?: string | null;
  licenses?: string | null;
  notOffered?: string | null;
}

function parseIndustry(industry: string | null | undefined): {
  structured: StructuredProfile | null;
  legacyText: string | null;
} {
  if (!industry?.trim()) return { structured: null, legacyText: null };
  try {
    const parsed = JSON.parse(industry);
    if (parsed && typeof parsed === "object" && parsed.version === 1) {
      return { structured: parsed, legacyText: null };
    }
  } catch {
    // not JSON — treat as legacy free-form industry description
  }
  return { structured: null, legacyText: industry };
}

function buildProfileText(company: {
  name: string;
  industry: string | null;
  keywords: string[] | null;
  operating_regions: string[] | null;
}): string {
  const { structured, legacyText } = parseIndustry(company.industry);

  const parts: string[] = [];
  const push = (label: string, value: string | null | undefined) => {
    const v = value?.trim();
    if (v) parts.push(`${label}: ${v}`);
  };

  // 1. Description (or legacy fallback)
  const description = structured?.companyDescription?.trim() || legacyText?.trim() || null;
  if (description) {
    push("Firma se bavi", description);
  }

  // 2. Past clients
  push("Dosadašnji klijenti", structured?.pastClients ?? null);

  // 3. Licenses
  push("Licence i certifikati", structured?.licenses ?? null);

  // 4. Not offered
  push("Ne radi", structured?.notOffered ?? null);

  // 5. Geographic area
  const regions = company.operating_regions ?? [];
  if (regions.length > 0) {
    push("Geografsko područje", regions.join(", "));
  }

  // 6. Category of activity
  const categories = structured?.offeringCategories ?? [];
  if (categories.length > 0) {
    push("Kategorija djelatnosti", categories.map(labelFor).join(", "));
  }

  // Fallback augmentation: if we still have no meaningful signal (no description,
  // no categories), use keywords + name so the embedding isn't empty.
  if (parts.length === 0) {
    const keywordHints = (company.keywords ?? []).slice(0, 25).join(", ");
    if (keywordHints) {
      push("Firma se bavi", `${company.name}. Pojmovi: ${keywordHints}`);
    } else if (company.name) {
      push("Firma se bavi", company.name);
    }
  } else if ((company.keywords ?? []).length > 0 && !description) {
    // If we have categories but no description, still add keyword hints for richer embedding.
    const keywordHints = company.keywords!.slice(0, 15).join(", ");
    push("Dodatni pojmovi", keywordHints);
  }

  return parts.join("\n");
}

function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const { data: companies, error } = await (s as any)
    .from("companies")
    .select("id, name, industry, keywords, operating_regions, profile_embedded_at")
    .is("profile_embedded_at", null);

  if (error) {
    console.error("select error:", error.message);
    process.exit(1);
  }

  console.log(`Found ${companies?.length ?? 0} companies without embedding`);
  if (!companies?.length) return;

  let updated = 0;
  let skipped = 0;
  for (const c of companies as any[]) {
    const profileText = buildProfileText(c);
    if (!profileText || profileText.trim().length < 5) {
      console.log(`  SKIP ${c.id} (${c.name}): insufficient profile signal`);
      skipped++;
      continue;
    }

    const clean = profileText.replace(/\s+/g, " ").trim().slice(0, MAX_INPUT_CHARS);
    try {
      const resp = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: clean,
      });
      const vec = toPgVector(resp.data[0].embedding);
      const { error: upErr } = await (s as any)
        .from("companies")
        .update({
          profile_text: profileText,
          profile_embedding: vec,
          profile_embedded_at: new Date().toISOString(),
        })
        .eq("id", c.id);
      if (upErr) {
        console.error(`  FAIL ${c.id} (${c.name}):`, upErr.message);
        continue;
      }

      // purge stale cache (none expected for first-time embed, but be safe)
      await (s as any).from("tender_relevance").delete().eq("company_id", c.id);

      updated++;
      console.log(`  OK   ${c.id} (${c.name}): ${profileText.length} chars`);
    } catch (err) {
      console.error(`  FAIL ${c.id} (${c.name}):`, err);
    }
  }

  console.log(`\nDone. updated=${updated}, skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
