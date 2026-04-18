import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  serializeCompanyProfile,
  derivePrimaryIndustry,
  buildProfileKeywordSeeds,
  buildProfileCpvSeeds,
  sanitizeSearchKeywords,
  getProfileOptionLabel,
  buildProfileContextText,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import { getRegionSelectionLabels } from "@/lib/constants/regions";

// GET /api/agency/clients - List all clients
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") {
    return NextResponse.json({ error: "Agency plan required" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("agency_clients")
    .select(`
      id, status, crm_stage, notes, contract_start, contract_end, monthly_fee, created_at,
      companies (id, name, jib, industry, contact_email, contact_phone, operating_regions)
    `)
    .eq("agency_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
}

// POST /api/agency/clients - Create a new client with company profile
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") {
    return NextResponse.json({ error: "Agency plan required" }, { status: 403 });
  }

  const body = await request.json();
  const {
    companyName,
    companyJib,
    companyPdv,
    companyAddress,
    companyContactEmail,
    companyContactPhone,
    offeringCategories = [],
    specializationIds = [],
    preferredTenderTypes = [],
    operatingRegions = [],
    description,
    notes,
    crmStage,
    contractStart,
    contractEnd,
    monthlyFee,
    existingCompanyId,
  } = body;

  if (!companyName || !companyJib) {
    return NextResponse.json({ error: "Company name and JIB are required" }, { status: 400 });
  }

  // Build structured profile identical to self-onboarding
  const primaryIndustry = derivePrimaryIndustry(offeringCategories, null);
  const regionLabels = getRegionSelectionLabels(operatingRegions);

  const descriptionFallback = [
    primaryIndustry ? `Fokus firme je ${getProfileOptionLabel(primaryIndustry)}.` : null,
    offeringCategories.length > 0
      ? `Firma nudi ${offeringCategories.map((id: string) => getProfileOptionLabel(id)).join(", ")}.`
      : null,
    preferredTenderTypes.length > 0
      ? `Najviše prati tendere za ${preferredTenderTypes.map((id: string) => getProfileOptionLabel(id)).join(", ")}.`
      : null,
    regionLabels.length > 0
      ? `Firma posluje u: ${regionLabels.join(", ")}.`
      : "Firma posluje na nivou cijele BiH.",
  ].filter(Boolean).join(" ");

  const effectiveDescription = description?.trim() || descriptionFallback;

  const profile: ParsedCompanyProfile = {
    primaryIndustry,
    offeringCategories,
    specializationIds,
    preferredTenderTypes,
    companyDescription: effectiveDescription,
    legacyIndustryText: null,
    manualKeywords: [],
  };

  const serializedIndustry = serializeCompanyProfile(profile) ?? buildProfileContextText({
    description: effectiveDescription,
    primaryIndustry,
    offeringCategories,
    specializationIds,
    preferredTenderTypes,
    regions: regionLabels,
  });

  const profileKeywordSeeds = buildProfileKeywordSeeds(profile);
  const profileCpvSeeds = buildProfileCpvSeeds(profile);

  // Try AI generation for better keywords/CPV codes
  let generatedKeywords = profileKeywordSeeds;
  let generatedCpvCodes = profileCpvSeeds;

  try {
    const generateRes = await fetch(new URL("/api/onboarding/generate-profile", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: effectiveDescription,
        primaryIndustry,
        offeringCategories,
        specializationIds,
        preferredTenderTypes,
        regions: regionLabels,
      }),
    });

    if (generateRes.ok) {
      const generated = await generateRes.json();
      if (generated.keywords?.length) generatedKeywords = generated.keywords;
      if (generated.cpv_codes?.length) generatedCpvCodes = generated.cpv_codes;
      if (generated.enrichment) {
        profile.aiCoreKeywords = generated.enrichment.core_keywords;
        profile.aiBroadKeywords = generated.enrichment.broad_keywords;
        profile.aiCpvCodes = generated.enrichment.cpv_codes;
        profile.aiNegativeKeywords = generated.enrichment.negative_keywords;
        profile.aiEnrichedAt = new Date().toISOString();
      }
    }
  } catch (e) {
    console.error("Agency client AI profile generation error:", e);
  }

  // Re-serialize with enrichment data included
  const finalSerializedIndustry = serializeCompanyProfile(profile) ?? serializedIndustry;

  const keywords = sanitizeSearchKeywords([...generatedKeywords, ...profileKeywordSeeds]);

  let companyId: string;

  if (existingCompanyId) {
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("id", existingCompanyId)
      .maybeSingle();

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    companyId = existingCompany.id;

    // Update company with new profile data
    await supabase.from("companies").update({
      industry: finalSerializedIndustry,
      keywords,
      cpv_codes: generatedCpvCodes,
      operating_regions: operatingRegions.length > 0 ? operatingRegions : null,
    }).eq("id", companyId);
  } else {
    const { data: existingByJib } = await supabase
      .from("companies")
      .select("id")
      .eq("jib", companyJib)
      .maybeSingle();

    if (existingByJib) {
      companyId = existingByJib.id;

      // Update existing company with the new profile data
      await supabase.from("companies").update({
        industry: finalSerializedIndustry,
        keywords,
        cpv_codes: generatedCpvCodes,
        operating_regions: operatingRegions.length > 0 ? operatingRegions : null,
      }).eq("id", companyId);
    } else {
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          user_id: user.id,
          name: companyName,
          jib: companyJib,
          pdv: companyPdv || null,
          address: companyAddress || null,
          contact_email: companyContactEmail || null,
          contact_phone: companyContactPhone || null,
          industry: finalSerializedIndustry,
          keywords,
          cpv_codes: generatedCpvCodes,
          operating_regions: operatingRegions.length > 0 ? operatingRegions : null,
        })
        .select("id")
        .single();

      if (companyError) {
        return NextResponse.json({ error: companyError.message }, { status: 500 });
      }
      companyId = newCompany.id;
    }
  }

  // Check if this agency-client relationship already exists
  const { data: existingRelation } = await supabase
    .from("agency_clients")
    .select("id")
    .eq("agency_user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingRelation) {
    return NextResponse.json(
      { error: "Ovaj klijent je već dodan u vašu agenciju." },
      { status: 409 }
    );
  }

  // Create the agency_clients relationship
  const { data: agencyClient, error: relationError } = await supabase
    .from("agency_clients")
    .insert({
      agency_user_id: user.id,
      company_id: companyId,
      notes: notes || null,
      crm_stage: crmStage || "active",
      contract_start: contractStart || null,
      contract_end: contractEnd || null,
      monthly_fee: monthlyFee ? Number(monthlyFee) : null,
    })
    .select("id")
    .single();

  if (relationError) {
    return NextResponse.json({ error: relationError.message }, { status: 500 });
  }

  return NextResponse.json({ id: agencyClient.id, companyId }, { status: 201 });
}
