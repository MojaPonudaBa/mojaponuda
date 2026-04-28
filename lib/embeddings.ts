import { getOpenAIClient } from "@/lib/openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_CHARS = 8000;

function sanitizeInput(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_INPUT_CHARS);
}

/**
 * Generate an OpenAI embedding for a single text input.
 * Returns the raw vector (1536 floats for text-embedding-3-small).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = sanitizeInput(text);
  if (!cleaned) throw new Error("generateEmbedding: empty input");
  const openai = getOpenAIClient();
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleaned,
  });
  return resp.data[0].embedding;
}

/** Batch embedding generation (up to ~20 inputs at a time is reasonable). */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const cleaned = texts.map(sanitizeInput).map((t) => t || " ");
  const openai = getOpenAIClient();
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleaned,
  });
  return resp.data.map((d) => d.embedding);
}

export interface CompanyProfileEmbeddingInputs {
  /** Obavezno: čime se firma bavi (opis 2–5 rečenica). Jedini free-text signal za embedding. */
  description: string;
  /** Geografsko područje (serijalizirani labele). */
  regionsText?: string | null;
  /** Kategorija djelatnosti iz Koraka 1. */
  categoryText?: string | null;
}

/** Combines all onboarding fields into the single profile text used for embedding + LLM reranking. */
export function buildCompanyProfileEmbeddingText(
  inputs: CompanyProfileEmbeddingInputs
): string {
  const parts: string[] = [];
  const push = (label: string, value?: string | null) => {
    const v = value?.trim();
    if (v) parts.push(`${label}: ${v}`);
  };
  push("Firma se bavi", inputs.description);
  push("Geografsko područje", inputs.regionsText ?? null);
  push("Kategorija djelatnosti", inputs.categoryText ?? null);
  return parts.join("\n");
}

/** Compose a tender-side text suitable for embedding. */
export function buildTenderEmbeddingText(t: {
  title?: string | null;
  raw_description?: string | null;
  cpv_code?: string | null;
  contract_type?: string | null;
  contracting_authority?: string | null;
}): string {
  const parts: string[] = [];
  if (t.title) parts.push(`Naslov: ${t.title}`);
  if (t.contract_type) parts.push(`Tip: ${t.contract_type}`);
  if (t.cpv_code) parts.push(`CPV: ${t.cpv_code}`);
  if (t.contracting_authority) parts.push(`Naručilac: ${t.contracting_authority}`);
  if (t.raw_description) parts.push(`Opis: ${t.raw_description}`);
  return parts.join("\n");
}

/** Serialize a number[] as a pgvector literal string (e.g. "[0.1,0.2,...]"). */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** Parse pgvector textual format back to number[] (for rows returned as string). */
export function fromPgVector(value: unknown): number[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as number[];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  }
  return null;
}
