import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import type { Bid, Tender, Company, Json } from "@/types/database";

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini sa dubokim poznavanjem Zakona o javnim nabavkama BiH (Službeni glasnik BiH, br. 39/14).

Tvoj zadatak je analizirati tender dokumentaciju i identifikovati:
1. Sve dokumentacijske zahtjeve koje ponuđač mora ispuniti
2. Rokove koji su relevantni za pripremu ponude
3. Uslove kvalifikacije i podobnosti
4. Rizike koji mogu dovesti do diskvalifikacije ponude

Za svaki dokumentacijski zahtjev, klasificiraj ga u jedan od sljedećih tipova:
- registration: rješenje o registraciji, izvod iz sudskog registra
- tax: porezna uvjerenja, uvjerenje o izmirenim porezima
- contributions: uvjerenja o izmirenim doprinosima za zaposlene
- guarantee: bankarska garancija, garancija za ozbiljnost ponude
- reference: lista referenci, potvrde o uspješno izvršenim ugovorima
- financial: bilans stanja, bilans uspjeha, finansijski izvještaji
- staff: CV-ovi ključnog osoblja, diplome, certifikati
- license: dozvole za obavljanje djelatnosti, posebne licence
- declaration: izjave (npr. o nekažnjavanju, o ekonomskoj i finansijskoj sposobnosti)
- other: ostali dokumenti koji ne spadaju u gornje kategorije

Budi precizan i detaljan. Ako tekst tendera ne sadrži dovoljno informacija za određeni zahtjev, označi ga kao rizik. Uvijek pretpostavi najstroži mogući zahtjev prema Zakonu o javnim nabavkama BiH.

Odgovori ISKLJUČIVO u traženom JSON formatu.`;

interface AnalysisChecklistItem {
  name: string;
  description: string;
  document_type:
    | "registration"
    | "tax"
    | "contributions"
    | "guarantee"
    | "reference"
    | "financial"
    | "staff"
    | "license"
    | "declaration"
    | "other";
  is_required: boolean;
  risk_note: string | null;
}

interface AnalysisDeadline {
  label: string;
  date: string;
}

interface AnalysisResult {
  checklist_items: AnalysisChecklistItem[];
  deadlines: AnalysisDeadline[];
  eligibility_conditions: string[];
  risk_flags: string[];
}

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "tender_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        checklist_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Naziv stavke" },
              description: {
                type: "string",
                description: "Detaljan opis šta je potrebno pripremiti",
              },
              document_type: {
                type: "string",
                enum: [
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
                ],
              },
              is_required: {
                type: "boolean",
                description: "Da li je stavka obavezna",
              },
              risk_note: {
                type: ["string", "null"],
                description:
                  "Napomena o riziku ako postoji, inače null",
              },
            },
            required: [
              "name",
              "description",
              "document_type",
              "is_required",
              "risk_note",
            ],
            additionalProperties: false,
          },
        },
        deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              date: {
                type: "string",
                description: "Datum u formatu YYYY-MM-DD ili opis",
              },
            },
            required: ["label", "date"],
            additionalProperties: false,
          },
        },
        eligibility_conditions: {
          type: "array",
          items: { type: "string" },
          description: "Uslovi kvalifikacije i podobnosti",
        },
        risk_flags: {
          type: "array",
          items: { type: "string" },
          description:
            "Ozbiljni rizici koji mogu dovesti do diskvalifikacije",
        },
      },
      required: [
        "checklist_items",
        "deadlines",
        "eligibility_conditions",
        "risk_flags",
      ],
      additionalProperties: false,
    },
  },
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = await request.json();
  const { bid_id } = body;

  if (!bid_id) {
    return NextResponse.json(
      { error: "bid_id je obavezan." },
      { status: 400 }
    );
  }

  // Dohvati firmu
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) {
    return NextResponse.json(
      { error: "Firma nije pronađena." },
      { status: 403 }
    );
  }

  // Dohvati ponudu s tenderom
  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", bid_id)
    .single();

  const bid = bidData as unknown as (Bid & { tenders: Tender }) | null;

  if (!bid || bid.company_id !== company.id) {
    return NextResponse.json(
      { error: "Ponuda nije pronađena." },
      { status: 404 }
    );
  }

  const tender = bid.tenders;

  // Pripremi tekst za analizu
  const tenderText = [
    `Naziv tendera: ${tender.title}`,
    tender.contracting_authority
      ? `Naručilac: ${tender.contracting_authority}`
      : null,
    tender.contract_type ? `Tip ugovora: ${tender.contract_type}` : null,
    tender.procedure_type ? `Procedura: ${tender.procedure_type}` : null,
    tender.estimated_value
      ? `Procijenjena vrijednost: ${tender.estimated_value} KM`
      : null,
    tender.deadline
      ? `Rok za ponude: ${new Date(tender.deadline).toLocaleDateString("bs-BA")}`
      : null,
    tender.raw_description
      ? `\nOpis tendera:\n${tender.raw_description}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Pozovi OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analiziraj sljedeći tender i vrati strukturiranu analizu:\n\n${tenderText}`,
        },
      ],
      response_format: RESPONSE_SCHEMA,
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "AI nije vratio odgovor." },
        { status: 500 }
      );
    }

    const analysis: AnalysisResult = JSON.parse(rawContent);

    // Spremi AI analizu u bids.ai_analysis
    await supabase
      .from("bids")
      .update({ ai_analysis: analysis as unknown as Json })
      .eq("id", bid_id);

    // Kreiraj checklist stavke iz analize
    const existingChecklist = await supabase
      .from("bid_checklist_items")
      .select("id")
      .eq("bid_id", bid_id);

    const startOrder = (existingChecklist.data?.length ?? 0);

    const checklistRows = analysis.checklist_items.map((item, idx) => ({
      bid_id,
      title: item.name,
      description: item.description,
      status: "missing" as const,
      risk_note: item.risk_note || null,
      sort_order: startOrder + idx,
    }));

    if (checklistRows.length > 0) {
      await supabase.from("bid_checklist_items").insert(checklistRows);
    }

    // Pozadinski upis: authority_requirement_patterns
    if (tender.contracting_authority_jib) {
      const patternRows = analysis.checklist_items.map((item) => ({
        contracting_authority_jib: tender.contracting_authority_jib!,
        document_type: item.document_type,
        tender_id: tender.id,
        is_required: item.is_required,
      }));

      // Fire-and-forget — ne blokiraj response
      (async () => {
        try {
          await supabase
            .from("authority_requirement_patterns")
            .upsert(patternRows, {
              onConflict: "contracting_authority_jib,document_type,tender_id",
            });
        } catch (err) {
          console.error("Pattern insert error:", err);
        }
      })();
    }

    return NextResponse.json({
      analysis,
      checklist_items_added: checklistRows.length,
    });
  } catch (err) {
    console.error("AI analysis error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `AI analiza nije uspjela: ${message}` },
      { status: 500 }
    );
  }
}
