// ============================================================
// PDF Text Extraction using pdfjs-dist
// Extracts text content page-by-page from PDF documents
// ============================================================

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Disable worker for serverless environment
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

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
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableWorker: true, // Disable worker for serverless
    });

    const pdf = await loadingTask.promise;
    const pages: ExtractedPage[] = [];
    let totalChars = 0;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items with spaces
      const pageText = textContent.items
        .map((item: any) => {
          if ("str" in item) {
            return item.str;
          }
          return "";
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const charCount = pageText.length;
      totalChars += charCount;

      pages.push({
        pageNumber: pageNum,
        text: pageText,
        charCount,
      });
    }

    // Extract metadata
    const metadata = await pdf.getMetadata();
    const info = metadata.info as any;

    return {
      pages,
      totalPages: pdf.numPages,
      totalChars,
      metadata: {
        title: info?.Title || undefined,
        author: info?.Author || undefined,
        subject: info?.Subject || undefined,
        creator: info?.Creator || undefined,
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
