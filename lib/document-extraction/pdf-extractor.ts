// ============================================================
// PDF Text Extraction using pdf-parse
// Extracts text content from PDF documents
// ============================================================

import pdf from "pdf-parse";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface PdfExtractionResult {
  pages: ExtractedPage[];
  totalPages: number;
  totalChars: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

export async function extractTextFromPdf(
  buffer: Buffer
): Promise<PdfExtractionResult> {
  try {
    const data = await pdf(buffer);

    // pdf-parse doesn't give us page-by-page text, so we approximate
    const totalPages = data.numpages;
    const fullText = data.text;
    const avgCharsPerPage = Math.ceil(fullText.length / totalPages);

    const pages: ExtractedPage[] = [];
    let totalChars = 0;

    // Split text into approximate pages
    for (let i = 0; i < totalPages; i++) {
      const start = i * avgCharsPerPage;
      const end = Math.min((i + 1) * avgCharsPerPage, fullText.length);
      const pageText = fullText.slice(start, end).trim();
      const charCount = pageText.length;
      totalChars += charCount;

      pages.push({
        pageNumber: i + 1,
        text: pageText,
        charCount,
      });
    }

    return {
      pages,
      totalPages,
      totalChars,
      metadata: {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        subject: data.info?.Subject || undefined,
        creator: data.info?.Creator || undefined,
      },
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export function combinePages(pages: ExtractedPage[]): string {
  return pages
    .map((page) => `[Stranica ${page.pageNumber}]\n${page.text}`)
    .join("\n\n");
}

export function getPageRange(
  pages: ExtractedPage[],
  startPage: number,
  endPage: number
): string {
  return pages
    .filter((p) => p.pageNumber >= startPage && p.pageNumber <= endPage)
    .map((page) => `[Stranica ${page.pageNumber}]\n${page.text}`)
    .join("\n\n");
}
