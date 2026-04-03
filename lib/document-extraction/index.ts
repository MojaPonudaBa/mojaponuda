// ============================================================
// Document Extraction Orchestrator
// Routes to appropriate extractor based on file type
// ============================================================

import { extractTextFromPdf, type PdfExtractionResult } from "./pdf-extractor";
import { extractTextFromDocx, extractTextFromDoc } from "./docx-extractor";

export interface DocumentExtractionResult {
  text: string;
  pages?: Array<{ pageNumber: number; text: string }>;
  pageCount?: number;
  charCount: number;
  fileType: string;
}

export async function extractTextFromDocument(
  buffer: Buffer,
  fileType: string
): Promise<DocumentExtractionResult> {
  const normalizedType = fileType.toLowerCase();

  if (normalizedType.includes("pdf") || normalizedType === "application/pdf") {
    const result = await extractTextFromPdf(buffer);
    return {
      text: result.pages.map((p) => p.text).join("\n\n"),
      pages: result.pages,
      pageCount: result.totalPages,
      charCount: result.totalChars,
      fileType: "pdf",
    };
  }

  if (
    normalizedType.includes("wordprocessingml") ||
    normalizedType.includes("docx") ||
    normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await extractTextFromDocx(buffer);
    return {
      text: result.text,
      charCount: result.charCount,
      fileType: "docx",
    };
  }

  if (
    normalizedType.includes("msword") ||
    normalizedType.includes("doc") ||
    normalizedType === "application/msword"
  ) {
    const result = await extractTextFromDoc(buffer);
    return {
      text: result.text,
      charCount: result.charCount,
      fileType: "doc",
    };
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export { extractTextFromPdf, extractTextFromDocx, extractTextFromDoc };
export type { PdfExtractionResult };
