import { PDFParse } from "pdf-parse";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  fullText: string;
  pageCount: number;
}

/**
 * Extract text from a PDF buffer using pdf-parse v2 (PDFParse class).
 * Adds [Stranica X] markers per page for AI page reference extraction.
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
    verbosity: 0,
  });

  const result = await parser.getText({
    pageJoiner: "\n\n[Stranica page_number]\n",
  });

  const pages: ExtractedPage[] = result.pages.map((p) => ({
    pageNumber: p.num,
    text: p.text,
  }));

  // Build fullText with [Stranica X] markers prepended to each page
  const fullText = pages
    .map((p) => `[Stranica ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  await parser.destroy();

  return {
    pages,
    fullText,
    pageCount: result.total,
  };
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const text = result.value.trim();

  return {
    pages: [{ pageNumber: 1, text }],
    fullText: text,
    pageCount: 1,
  };
}

/**
 * Extract text from a file based on its content type.
 */
export async function extractText(
  buffer: ArrayBuffer,
  contentType: string,
  fileName: string,
): Promise<ExtractionResult> {
  const lowerName = fileName.toLowerCase();

  if (contentType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return extractTextFromPDF(buffer);
  }

  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return extractTextFromDOCX(buffer);
  }

  if (contentType === "application/msword" || lowerName.endsWith(".doc")) {
    try {
      return await extractTextFromDOCX(buffer);
    } catch {
      throw new Error(
        "Stari .doc format nije podržan. Molimo konvertujte dokument u .docx ili .pdf format.",
      );
    }
  }

  throw new Error(
    `Nepodržan format dokumenta: ${contentType}. Podržani formati su PDF i DOCX.`,
  );
}
