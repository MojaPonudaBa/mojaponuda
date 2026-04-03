import { analyzeTender, type AnalysisChecklistItem, type AnalysisResult } from "@/lib/ai/tender-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AI_TO_VAULT_TYPE_MAP } from "@/lib/vault/constants";
import type { BidChecklistItemInsert, BidDocumentInsert, Json, Tender } from "@/types/database";

export type ChecklistSource = "ai" | "authority_patterns" | "default";

const CHECKLIST_DOCUMENT_TYPES = [
  "registration",
  "tax",
  "contributions",
  "guarantee",
  "reference",
  "financial",
  "staff",
  "license",
  "declaration",
  "other",
] as const;

const DOCUMENT_TYPE_LABELS: Record<AnalysisChecklistItem["document_type"], string> = {
  registration: "Rješenje o registraciji",
  tax: "Porezno uvjerenje",
  contributions: "Uvjerenje o doprinosima",
  guarantee: "Bankarska garancija",
  reference: "Reference projekata",
  financial: "Finansijski izvještaji",
  staff: "Ključno osoblje",
  license: "Dozvole i licence",
  declaration: "Izjave ponuđača",
  other: "Ostala dokumentacija",
};

const DOCUMENT_TYPE_DESCRIPTIONS: Record<AnalysisChecklistItem["document_type"], string> = {
  registration: "Pripremite aktuelni izvod iz registra ili drugi dokaz o registraciji ponuđača.",
  tax: "Provjerite da li imate važeće uvjerenje o izmirenim poreskim obavezama.",
  contributions: "Pripremite dokaz o izmirenim doprinosima za zaposlene ako se traži tenderom.",
  guarantee: "Provjerite da li je potrebna garancija za ozbiljnost ponude ili uredno izvršenje ugovora.",
  reference: "Prikupite reference i potvrde o sličnim uspješno izvršenim ugovorima.",
  financial: "Pripremite finansijske izvještaje, bilanse ili bankovne potvrde ako su tražene.",
  staff: "Prikupite CV-eve, diplome i certifikate ključnog osoblja relevantnog za predmet nabavke.",
  license: "Provjerite posebne dozvole, licence ili odobrenja potrebna za izvršenje ugovora.",
  declaration: "Pripremite potpisane i ovjerene izjave koje tender zahtijeva od ponuđača.",
  other: "Dodajte dodatnu dokumentaciju koja se pojavljuje u tehničkim i administrativnim zahtjevima.",
};

const DEFAULT_STARTER_ITEMS: AnalysisChecklistItem[] = [
  {
    name: "Rješenje o registraciji",
    description: DOCUMENT_TYPE_DESCRIPTIONS.registration,
    document_type: "registration",
    is_required: true,
    risk_note: null,
  },
  {
    name: "Porezno uvjerenje",
    description: DOCUMENT_TYPE_DESCRIPTIONS.tax,
    document_type: "tax",
    is_required: true,
    risk_note: "Provjerite datum važenja prije finalne predaje ponude.",
  },
  {
    name: "Izjave ponuđača",
    description: DOCUMENT_TYPE_DESCRIPTIONS.declaration,
    document_type: "declaration",
    is_required: true,
    risk_note: null,
  },
  {
    name: "Reference projekata",
    description: DOCUMENT_TYPE_DESCRIPTIONS.reference,
    document_type: "reference",
    is_required: false,
    risk_note: "Provjerite minimalan broj i vrijednost traženih referenci.",
  },
];

function isChecklistDocumentType(value: string): value is AnalysisChecklistItem["document_type"] {
  return CHECKLIST_DOCUMENT_TYPES.includes(value as AnalysisChecklistItem["document_type"]);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function buildFallbackFromPatterns(
  patterns: Array<{ document_type: string; is_required: boolean }>
): AnalysisChecklistItem[] {
  const counts = new Map<AnalysisChecklistItem["document_type"], { total: number; required: number }>();

  for (const pattern of patterns) {
    if (!isChecklistDocumentType(pattern.document_type)) {
      continue;
    }

    const entry = counts.get(pattern.document_type) ?? { total: 0, required: 0 };
    entry.total += 1;
    entry.required += pattern.is_required ? 1 : 0;
    counts.set(pattern.document_type, entry);
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1].required !== a[1].required) {
        return b[1].required - a[1].required;
      }
      return b[1].total - a[1].total;
    })
    .slice(0, 6)
    .map(([documentType, stats]) => ({
      name: DOCUMENT_TYPE_LABELS[documentType],
      description: DOCUMENT_TYPE_DESCRIPTIONS[documentType],
      document_type: documentType,
      is_required: stats.required >= Math.ceil(stats.total / 2),
      risk_note:
        stats.required === stats.total && stats.total > 1
          ? "Ovaj dokument se često pojavljuje kod ovog naručioca."
          : null,
    }));
}

function buildAnalysisResult(
  tender: Tender,
  checklistItems: AnalysisChecklistItem[],
  baseAnalysis: AnalysisResult | null,
  source: ChecklistSource
): AnalysisResult {
  const riskFlags = [...(baseAnalysis?.risk_flags ?? [])];

  if (!tender.raw_description?.trim()) {
    riskFlags.unshift(
      "Detaljan opis tendera nije objavljen; početna checklista je generisana iz dostupnih podataka i obrazaca naručioca."
    );
  }

  if (source !== "ai") {
    riskFlags.push(
      "Provjerite originalnu tendernu dokumentaciju i dopunite checklistu specifičnim zahtjevima prije finalne predaje."
    );
  }

  const deadlines = [...(baseAnalysis?.deadlines ?? [])];
  if (tender.deadline && !deadlines.some((item) => item.label === "Rok za ponude")) {
    deadlines.unshift({
      label: "Rok za ponude",
      date: new Date(tender.deadline).toLocaleDateString("bs-BA"),
    });
  }

  return {
    checklist_items: checklistItems,
    deadlines,
    eligibility_conditions: baseAnalysis?.eligibility_conditions ?? [],
    risk_flags: uniqueStrings(riskFlags),
  };
}

async function persistAuthorityPatterns(checklistItems: AnalysisChecklistItem[], tender: Tender) {
  if (!tender.contracting_authority_jib || !checklistItems.length) {
    return;
  }

  const supabaseAdmin = createAdminClient();
  const patternRows = checklistItems.map((item) => ({
    contracting_authority_jib: tender.contracting_authority_jib!,
    document_type: item.document_type,
    tender_id: tender.id,
    is_required: item.is_required,
  }));

  const { error } = await supabaseAdmin
    .from("authority_requirement_patterns")
    .upsert(patternRows, {
      onConflict: "contracting_authority_jib,document_type,tender_id",
    });

  if (error) {
    console.error("Authority pattern save error:", error.message);
  }
}

export async function ensureBidChecklist({
  bidId,
  companyId,
  tender,
  allowAI,
}: {
  bidId: string;
  companyId: string;
  tender: Tender;
  allowAI: boolean;
}): Promise<{
  analysis: AnalysisResult;
  checklistItemsAdded: number;
  autoAttached: number;
  source: ChecklistSource;
}> {
  const supabase = await createClient();

  const { data: existingChecklist, error: existingChecklistError } = await supabase
    .from("bid_checklist_items")
    .select("id")
    .eq("bid_id", bidId);

  if (existingChecklistError) {
    throw new Error(`Čitanje postojeće checkliste nije uspjelo: ${existingChecklistError.message}`);
  }

  // Check if tender has document analysis
  const aiAnalysis = tender.ai_analysis as any;
  const documentAnalysis = aiAnalysis?.document_analysis;

  if (!documentAnalysis || !documentAnalysis.requirements?.length) {
    throw new Error(
      "Tendenska dokumentacija nije analizirana. Molimo uploadujte tendersku dokumentaciju prije kreiranja ponude."
    );
  }

  // Use document analysis requirements
  const checklistItems: AnalysisChecklistItem[] = documentAnalysis.requirements.map(
    (req: any) => ({
      name: req.name,
      description: req.description,
      document_type: req.document_type,
      is_required: req.is_required,
      risk_note: req.risk_note,
    })
  );

  const source: ChecklistSource = "ai";
  const analysis = buildAnalysisResult(tender, checklistItems, documentAnalysis, source);

  const { error: bidUpdateError } = await supabase
    .from("bids")
    .update({ ai_analysis: analysis as unknown as Json })
    .eq("id", bidId);

  if (bidUpdateError) {
    throw new Error(`Spremanje AI analize nije uspjelo: ${bidUpdateError.message}`);
  }

  if (source === "ai") {
    await persistAuthorityPatterns(checklistItems, tender);
  }

  if ((existingChecklist?.length ?? 0) > 0) {
    return {
      analysis,
      checklistItemsAdded: 0,
      autoAttached: 0,
      source,
    };
  }

  const { data: vaultDocs, error: vaultDocsError } = await supabase
    .from("documents")
    .select("id, type, expires_at")
    .eq("company_id", companyId);

  if (vaultDocsError) {
    throw new Error(`Čitanje dokumenata iz trezora nije uspjelo: ${vaultDocsError.message}`);
  }

  const checklistRows: BidChecklistItemInsert[] = checklistItems.map((item, idx) => {
    let docId: string | null = null;
    let status: "missing" | "attached" = "missing";

    if (item.document_type) {
      const targetType = AI_TO_VAULT_TYPE_MAP[item.document_type];
      if (targetType) {
        const match = vaultDocs?.find(
          (document) =>
            document.type === targetType &&
            (!document.expires_at || new Date(document.expires_at) > new Date())
        );

        if (match) {
          docId = match.id;
          status = "attached";
        }
      }
    }

    // Get page references and quote from document analysis
    const docReq = documentAnalysis.requirements.find((r: any) => r.name === item.name);

    return {
      bid_id: bidId,
      title: item.name,
      description: item.description,
      status,
      document_id: docId,
      document_type: item.document_type,
      risk_note: item.risk_note || null,
      sort_order: idx,
      page_references: docReq?.page_references || null,
      source_quote: docReq?.source_quote || null,
    };
  });

  const { error: checklistInsertError } = await supabase
    .from("bid_checklist_items")
    .insert(checklistRows);

  if (checklistInsertError) {
    throw new Error(`Kreiranje checklist stavki nije uspjelo: ${checklistInsertError.message}`);
  }

  const autoAttachedDocs: BidDocumentInsert[] = checklistRows
    .filter((row) => row.document_id)
    .map((row) => ({
      bid_id: bidId,
      document_id: row.document_id!,
      checklist_item_name: row.title,
      is_confirmed: false,
    }));

  if (autoAttachedDocs.length > 0) {
    const { error: autoAttachError } = await supabase
      .from("bid_documents")
      .insert(autoAttachedDocs);

    if (autoAttachError) {
      throw new Error(`Automatsko povezivanje dokumenata nije uspjelo: ${autoAttachError.message}`);
    }
  }

  return {
    analysis,
    checklistItemsAdded: checklistRows.length,
    autoAttached: autoAttachedDocs.length,
    source,
  };
}
