// ============================================================
// DOCX Text Extraction using mammoth
// Extracts text content from Word documents
// ============================================================

import mammoth from "mammoth";

export interface DocxExtractionResult {
  text: string;
  charCount: number;
  messages: string[];
}

export async function extractTextFromDocx(
  buffer: Buffer
): Promise<DocxExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    return {
      text: result.value.trim(),
      charCount: result.value.length,
      messages: result.messages.map((m) => m.message),
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error(
      `Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// For older .doc files, we'll use the same approach
// mammoth handles both formats
export async function extractTextFromDoc(
  buffer: Buffer
): Promise<DocxExtractionResult> {
  return extractTextFromDocx(buffer);
}
