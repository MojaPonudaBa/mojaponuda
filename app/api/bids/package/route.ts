import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBidAccess } from "@/lib/bids/access";
import type { Bid, Tender, Company, Document } from "@/types/database";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 42;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function sanitizeFileNamePart(value: string) {
  return value
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getDocumentExtension(document: Pick<Document, "file_path" | "name">) {
  const fromPath = document.file_path.split(".").pop();
  const fromName = document.name.split(".").pop();
  return (fromPath || fromName || "").toLowerCase();
}

function wrapText(font: PDFFont, text: string, fontSize: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r/g, "").split("\n");

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      const nextWidth = font.widthOfTextAtSize(nextLine, fontSize);

      if (nextWidth <= maxWidth || !currentLine) {
        currentLine = nextLine;
        continue;
      }

      lines.push(currentLine);
      currentLine = word;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

async function buildCoverSheetPdf(
  bid: Bid & { tenders: Tender; companies: Company },
  attachedDocs: Array<
    Document & {
      bid_doc_id: string;
      checklist_item_name: string | null;
    }
  >,
) {
  const coverSheet = new jsPDF();

  coverSheet.setFontSize(20);
  coverSheet.setFont("helvetica", "bold");
  coverSheet.text("Objedinjena dokumentacija ponude", 105, 20, { align: "center" });

  coverSheet.setFontSize(12);
  coverSheet.setFont("helvetica", "normal");
  coverSheet.text(`Datum: ${new Date().toLocaleDateString("bs-BA")}`, 105, 30, { align: "center" });

  coverSheet.setFillColor(240, 240, 240);
  coverSheet.rect(15, 40, 180, 10, "F");
  coverSheet.setFontSize(11);
  coverSheet.setFont("helvetica", "bold");
  coverSheet.text("Podaci o tenderu", 20, 46);

  coverSheet.setFontSize(10);
  coverSheet.setFont("helvetica", "normal");
  coverSheet.text(`Naziv: ${bid.tenders.title}`, 20, 58, { maxWidth: 170 });

  let yPos = 58 + coverSheet.getTextDimensions(bid.tenders.title, { maxWidth: 170 }).h + 5;

  coverSheet.text(`Naručilac: ${bid.tenders.contracting_authority || "-"}`, 20, yPos);
  yPos += 6;
  coverSheet.text(`Rok za dostavu: ${formatDate(bid.tenders.deadline)}`, 20, yPos);
  yPos += 10;

  coverSheet.setFillColor(240, 240, 240);
  coverSheet.rect(15, yPos, 180, 10, "F");
  coverSheet.setFont("helvetica", "bold");
  coverSheet.setFontSize(11);
  coverSheet.text("Podaci o ponuđaču", 20, yPos + 6);
  yPos += 15;

  coverSheet.setFont("helvetica", "normal");
  coverSheet.setFontSize(10);
  coverSheet.text(`Naziv: ${bid.companies.name}`, 20, yPos);
  yPos += 6;
  coverSheet.text(`JIB: ${bid.companies.jib}`, 20, yPos);
  yPos += 6;
  coverSheet.text(`Adresa: ${bid.companies.address || "-"}`, 20, yPos);
  yPos += 12;

  coverSheet.setFont("helvetica", "bold");
  coverSheet.text("Dokumenti u PDF paketu:", 20, yPos);
  yPos += 5;

  const tableData = attachedDocs.map((doc, index) => [
    (index + 1).toString(),
    doc.name,
    doc.type || "-",
    doc.checklist_item_name || "Opći prilog",
  ]);

  autoTable(coverSheet, {
    startY: yPos,
    head: [["Br.", "Naziv dokumenta", "Tip", "Veza sa stavkom"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255] },
    margin: { left: 15, right: 15 },
  });

  const finalY = (
    coverSheet as jsPDF & { lastAutoTable?: { finalY?: number } }
  ).lastAutoTable?.finalY ?? yPos + 10;

  coverSheet.setFontSize(9);
  coverSheet.setTextColor(90, 90, 90);
  coverSheet.text(
    "Pregledajte PDF, odštampajte ga i pridružite ga ostatku dokumentacije koju šaljete naručiocu.",
    15,
    Math.min(finalY + 10, 285),
    { maxWidth: 180 },
  );

  return new Uint8Array(coverSheet.output("arraybuffer"));
}

async function addNoticePage(
  pdf: PDFDocument,
  regularFont: PDFFont,
  boldFont: PDFFont,
  title: string,
  message: string,
) {
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: A4_WIDTH,
    height: A4_HEIGHT,
    color: rgb(1, 1, 1),
  });

  page.drawText(title, {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 88,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.14, 0.22),
    maxWidth: A4_WIDTH - PAGE_MARGIN * 2,
  });

  const lines = wrapText(regularFont, message, 11, A4_WIDTH - PAGE_MARGIN * 2);
  let y = A4_HEIGHT - 130;
  for (const line of lines) {
    if (y < PAGE_MARGIN + 20) {
      break;
    }

    page.drawText(line, {
      x: PAGE_MARGIN,
      y,
      size: 11,
      font: regularFont,
      color: rgb(0.28, 0.32, 0.39),
    });
    y -= 16;
  }
}

async function addImageDocument(
  pdf: PDFDocument,
  bytes: Uint8Array,
  extension: string,
  fileName: string,
  regularFont: PDFFont,
) {
  const image =
    extension === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const availableWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const availableHeight = A4_HEIGHT - PAGE_MARGIN * 2 - 24;
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height, 1);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (A4_WIDTH - width) / 2;
  const y = (A4_HEIGHT - height) / 2;

  page.drawText(fileName, {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - PAGE_MARGIN + 4,
    size: 10,
    font: regularFont,
    color: rgb(0.33, 0.39, 0.49),
    maxWidth: A4_WIDTH - PAGE_MARGIN * 2,
  });

  page.drawImage(image, {
    x,
    y,
    width,
    height,
  });
}

async function addDocxDocument(
  pdf: PDFDocument,
  bytes: Uint8Array,
  fileName: string,
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  const extraction = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });
  const text = extraction.value.trim();

  if (!text) {
    await addNoticePage(
      pdf,
      regularFont,
      boldFont,
      fileName,
      "Ovaj DOCX dokument nije imao čitljiv tekst za automatsko spajanje. Otvorite original i po potrebi ga priložite uz ostalu dokumentaciju.",
    );
    return;
  }

  const fontSize = 11;
  const lineHeight = 15;
  const maxWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const lines = wrapText(regularFont, text, fontSize, maxWidth);
  let page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - PAGE_MARGIN;

  page.drawText(fileName, {
    x: PAGE_MARGIN,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.14, 0.22),
    maxWidth,
  });

  y -= 28;

  for (const line of lines) {
    if (y < PAGE_MARGIN) {
      page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
      y = A4_HEIGHT - PAGE_MARGIN;
    }

    if (line) {
      page.drawText(line, {
        x: PAGE_MARGIN,
        y,
        size: fontSize,
        font: regularFont,
        color: rgb(0.22, 0.25, 0.31),
        maxWidth,
      });
    }

    y -= lineHeight;
  }
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

  const access = await resolveBidAccess(supabase, user.id, bidId);
  if (!access) {
    return NextResponse.json({ error: "Nemate pravo pristupa ovoj ponudi." }, { status: 403 });
  }

  const { data: bidData, error: bidError } = await supabase
    .from("bids")
    .select("*, tenders(*), companies(*)")
    .eq("id", bidId)
    .single();

  if (bidError || !bidData) {
    return NextResponse.json({ error: "Ponuda nije pronadjena." }, { status: 404 });
  }

  const bid = bidData as Bid & { tenders: Tender; companies: Company };

  if (bid.company_id !== access.companyId) {
    return NextResponse.json({ error: "Nemate pravo pristupa ovoj ponudi." }, { status: 403 });
  }

  const { data: bidDocsData } = await supabase
    .from("bid_documents")
    .select("*, documents(*)")
    .eq("bid_id", bidId);

  const attachedDocs = ((bidDocsData ?? []) as {
    id: string;
    checklist_item_name: string | null;
    documents: Document | null;
  }[]).flatMap((bidDocument) => {
    if (!bidDocument.documents) {
      return [];
    }

    return [
      {
        ...bidDocument.documents,
        bid_doc_id: bidDocument.id,
        checklist_item_name: bidDocument.checklist_item_name,
      },
    ];
  });

  const mergedPdf = await PDFDocument.create();
  const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  const coverSheetBytes = await buildCoverSheetPdf(bid, attachedDocs);
  const coverSheetPdf = await PDFDocument.load(coverSheetBytes);
  const coverPages = await mergedPdf.copyPages(
    coverSheetPdf,
    coverSheetPdf.getPageIndices(),
  );
  for (const page of coverPages) {
    mergedPdf.addPage(page);
  }

  for (let index = 0; index < attachedDocs.length; index += 1) {
    const doc = attachedDocs[index];
    const extension = getDocumentExtension(doc);

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (downloadError) {
        console.error(`Failed to download ${doc.name}:`, downloadError);
        await addNoticePage(
          mergedPdf,
          regularFont,
          boldFont,
          doc.name,
          `Dokument nije bilo moguće preuzeti iz trezora. Sistem ga nije mogao dodati u objedinjeni PDF. Greška: ${downloadError.message}`,
        );
        continue;
      }

      if (fileData) {
        const bytes = new Uint8Array(await fileData.arrayBuffer());

        if (extension === "pdf") {
          const sourcePdf = await PDFDocument.load(bytes);
          const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
          for (const page of pages) {
            mergedPdf.addPage(page);
          }
          continue;
        }

        if (["jpg", "jpeg", "png"].includes(extension)) {
          await addImageDocument(mergedPdf, bytes, extension, doc.name, regularFont);
          continue;
        }

        if (extension === "docx") {
          await addDocxDocument(mergedPdf, bytes, doc.name, regularFont, boldFont);
          continue;
        }

        await addNoticePage(
          mergedPdf,
          regularFont,
          boldFont,
          doc.name,
          "Ovaj format ne možemo automatski spojiti u PDF. Otvorite originalni dokument, odštampajte ga i pridružite ga ostatku pripreme prije slanja ponude.",
        );
      }
    } catch (err) {
      console.error(`Error processing ${doc.name}:`, err);
      await addNoticePage(
        mergedPdf,
        regularFont,
        boldFont,
        doc.name,
        "Došlo je do greške tokom pripreme ovog dokumenta za objedinjeni PDF. Provjerite original i po potrebi ga dodajte ručno uz ostatak dokumentacije.",
      );
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  const pdfFileName = `priprema_${sanitizeFileNamePart(bid.companies.name)}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(mergedPdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName}"`,
    },
  });
}
