import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Bid, Tender, Company, Document } from "@/types/database";
import AdmZip from "adm-zip";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

  // 1. Fetch data
  const { data: bidData, error: bidError } = await supabase
    .from("bids")
    .select("*, tenders(*), companies(*)")
    .eq("id", bidId)
    .single();

  if (bidError || !bidData) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const bid = bidData as unknown as Bid & { tenders: Tender; companies: Company };

  if (bid.companies.user_id !== user.id) {
    return NextResponse.json({ error: "Nemate pravo pristupa ovoj ponudi." }, { status: 403 });
  }

  // Fetch attached documents
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

  // 2. Prepare ZIP
  const zip = new AdmZip();

  // 3. Add Cover Sheet PDF
  const coverSheet = new jsPDF();
  
  // Header
  coverSheet.setFontSize(20);
  coverSheet.setFont("helvetica", "bold");
  coverSheet.text("Propratni akt ponude", 105, 20, { align: "center" });
  
  coverSheet.setFontSize(12);
  coverSheet.setFont("helvetica", "normal");
  coverSheet.text(`Datum: ${new Date().toLocaleDateString("bs-BA")}`, 105, 30, { align: "center" });

  // Tender Info
  coverSheet.setFillColor(240, 240, 240);
  coverSheet.rect(15, 40, 180, 10, "F");
  coverSheet.setFontSize(11);
  coverSheet.setFont("helvetica", "bold");
  coverSheet.text("Podaci o tenderu", 20, 46);

  coverSheet.setFontSize(10);
  coverSheet.setFont("helvetica", "normal");
  coverSheet.text(`Naziv: ${bid.tenders.title}`, 20, 58, { maxWidth: 170 });
  
  let yPos = 58 + coverSheet.getTextDimensions(bid.tenders.title, { maxWidth: 170 }).h + 5;
  
  coverSheet.text(`Naručilac: ${bid.tenders.contracting_authority || "—"}`, 20, yPos);
  yPos += 6;
  coverSheet.text(`Rok za dostavu: ${formatDate(bid.tenders.deadline)}`, 20, yPos);
  yPos += 10;

  // Company Info
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
  coverSheet.text(`Adresa: ${bid.companies.address || "—"}`, 20, yPos);
  yPos += 12;

  // Documents Table
  coverSheet.setFont("helvetica", "bold");
  coverSheet.text("Sadržaj paketa:", 20, yPos);
  yPos += 5;

  const tableData = attachedDocs.map((doc, idx) => [
    (idx + 1).toString(),
    doc.name,
    doc.type || "—",
    formatDate(doc.expires_at)
  ]);

  autoTable(coverSheet, {
    startY: yPos,
    head: [["Br.", "Naziv dokumenta", "Tip", "Datum isteka"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255] },
    margin: { left: 15, right: 15 },
  });

  const pdfBuffer = Buffer.from(coverSheet.output("arraybuffer"));
  zip.addFile("00_Propratni_list.pdf", pdfBuffer);

  // 4. Download and add files from Storage
  // Organize by folders if needed, or flat list with prefixes
  
  for (let i = 0; i < attachedDocs.length; i++) {
    const doc = attachedDocs[i];
    const prefix = (i + 1).toString().padStart(2, "0");
    const safeName = doc.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    // Ensure extension
    const ext = doc.file_path.split(".").pop() || "pdf";
    const fileName = `${prefix}_${safeName}.${ext}`;

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (downloadError) {
        console.error(`Failed to download ${doc.name}:`, downloadError);
        // Add a text file explaining the error
        zip.addFile(
          `${prefix}_ERROR_${safeName}.txt`, 
          Buffer.from(`Nije uspjelo preuzimanje fajla: ${doc.file_path}\nGreška: ${downloadError.message}`)
        );
        continue;
      }

      if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        zip.addFile(fileName, Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.error(`Error processing ${doc.name}:`, err);
    }
  }

  // 5. Generate ZIP buffer
  const zipBuffer = zip.toBuffer();
  
  const zipFilename = `ponuda_${bid.companies.name.replace(/[^a-zA-Z0-9]/g, "")}_${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}
