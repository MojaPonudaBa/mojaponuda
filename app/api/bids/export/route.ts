import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  Bid,
  Tender,
  Company,
  BidChecklistItem,
  Document,
  ChecklistStatus,
} from "@/types/database";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  missing: "Nedostaje",
  attached: "Prilozeno",
  confirmed: "Potvrdeno",
};

const BID_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "U pregledu",
  submitted: "Predana",
  won: "Pobijedeno",
  lost: "Izgubljeno",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Bez roka";
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffDays = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return `Istekao (${formatDate(expiresAt)})`;
  return formatDate(expiresAt);
}

interface BidDocRow {
  id: string;
  document_id: string;
  documents: Document;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bidId = searchParams.get("bid_id");

  if (!bidId) {
    return NextResponse.json({ error: "bid_id je obavezan." }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  // Dohvati firmu
  const { data: companyData } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) {
    return NextResponse.json({ error: "Firma nije pronadena." }, { status: 403 });
  }

  // Dohvati ponudu s tender podacima
  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", bidId)
    .single();

  const bid = bidData as unknown as (Bid & { tenders: Tender }) | null;

  if (!bid || bid.company_id !== company.id) {
    return NextResponse.json({ error: "Ponuda nije pronadena." }, { status: 404 });
  }

  // Dohvati checklist
  const { data: checklistData } = await supabase
    .from("bid_checklist_items")
    .select("*")
    .eq("bid_id", bidId)
    .order("sort_order", { ascending: true });

  const checklistItems = (checklistData ?? []) as BidChecklistItem[];

  // Dohvati priložene dokumente
  const { data: bidDocsData } = await supabase
    .from("bid_documents")
    .select("id, document_id, documents(*)")
    .eq("bid_id", bidId);

  const attachedDocs = ((bidDocsData ?? []) as BidDocRow[]).map((bd) => bd.documents);

  // ============================================================
  // Generisanje PDF-a
  // ============================================================

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // --- Zaglavlje ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MojaPonuda.ba", margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Pregled pripreme ponude", margin, y);
  y += 3;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Podaci o firmi ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Firma", margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Naziv: ${company.name}`, margin, y);
  y += 4;
  doc.text(`JIB: ${company.jib}`, margin, y);
  y += 4;
  if (company.address) {
    doc.text(`Adresa: ${company.address}`, margin, y);
    y += 4;
  }
  y += 4;

  // --- Podaci o tenderu ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Tender", margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Naziv: ${bid.tenders.title}`, margin, y, {
    maxWidth: pageWidth - 2 * margin,
  });
  y += doc.getTextDimensions(bid.tenders.title, {
    maxWidth: pageWidth - 2 * margin,
  }).h + 2;

  if (bid.tenders.contracting_authority) {
    doc.text(`Narucilac: ${bid.tenders.contracting_authority}`, margin, y);
    y += 4;
  }
  if (bid.tenders.deadline) {
    doc.text(`Rok: ${formatDate(bid.tenders.deadline)}`, margin, y);
    y += 4;
  }
  doc.text(`Status ponude: ${BID_STATUS_LABELS[bid.status] || bid.status}`, margin, y);
  y += 4;

  const now = new Date();
  doc.text(
    `Datum generisanja: ${now.toLocaleDateString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} ${now.toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" })}`,
    margin,
    y
  );
  y += 8;

  // --- Checklist tabela ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Checklist zahtjeva", margin, y);
  y += 2;

  const confirmedCount = checklistItems.filter((i) => i.status === "confirmed").length;
  const totalCount = checklistItems.length;
  const pct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

  if (checklistItems.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Stavka", "Status", "Rizik"]],
      body: checklistItems.map((item, idx) => [
        String(idx + 1),
        item.title + (item.description ? `\n${item.description}` : ""),
        STATUS_LABELS[item.status],
        item.risk_note || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 40 },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  } else {
    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Nema stavki u checklistu.", margin, y);
    y += 6;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Kompletiranost: ${confirmedCount}/${totalCount} (${pct}%)`, margin, y);
  y += 8;

  // --- Priloženi dokumenti ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Prilozeni dokumenti", margin, y);
  y += 2;

  if (attachedDocs.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Naziv", "Tip", "Datum isteka"]],
      body: attachedDocs.map((d, idx) => [
        String(idx + 1),
        d.name,
        d.type || "—",
        formatExpiryLabel(d.expires_at),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  } else {
    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Nema prilozenih dokumenata.", margin, y);
    y += 6;
  }

  y += 4;

  // --- Interne bilješke ---
  if (bid.notes && bid.notes.trim().length > 0) {
    // Provjeri treba li nova stranica
    if (y > 250) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Interne biljeske", margin, y);
    y += 2;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(180, 0, 0);
    doc.text("INTERNO — Ne distribuirati", margin, y);
    y += 4;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const splitNotes = doc.splitTextToSize(
      bid.notes,
      pageWidth - 2 * margin
    );
    doc.text(splitNotes, margin, y);
  }

  // --- Footer na svakoj stranici ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `MojaPonuda.ba — Stranica ${i} od ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  // Vrati PDF kao download
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const filename = `ponuda_${bid.tenders.title
    .slice(0, 40)
    .replace(/[^a-zA-Z0-9\u0100-\u024F]/g, "_")}_${now.toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
