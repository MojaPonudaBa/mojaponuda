import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Disable worker entirely for serverless environments (Vercel)
GlobalWorkerOptions.workerSrc = "";

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
 * Extract text from a PDF buffer.
 * Returns per-page text and a combined full text.
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({ pageNumber: i, text });
  }

  return {
    pages,
    fullText: pages.map((p) => `[Stranica ${p.pageNumber}]\n${p.text}`).join("\n\n"),
    pageCount: doc.numPages,
  };
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const text = result.value.trim();

  // DOCX doesn't have pages, so treat it as a single block
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
    // .doc files - try mammoth (it handles some .doc files)
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
