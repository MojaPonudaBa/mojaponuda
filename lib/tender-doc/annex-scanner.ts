/**
 * Deterministic annex/form scanner.
 * Regex-scans extracted tender documentation text for annex and form references
 * that the AI might miss. Returns structured items to merge with AI results.
 */

export interface ScannedAnnex {
  name: string;
  description: string;
  page_number: number | null;
  page_reference: string | null;
  source_text: string;
}

/**
 * Scan extracted text (with [Stranica X] markers) for all annex/form references.
 * Returns deduplicated list of annexes found.
 */
export function scanForAnnexes(fullText: string): ScannedAnnex[] {
  const found = new Map<string, ScannedAnnex>();

  // Split text into pages using the [Stranica X] markers
  const pageBlocks = splitIntoPages(fullText);

  for (const block of pageBlocks) {
    // Pattern 1: "Aneks X" or "ANEKS X" standalone (annex headings)
    // e.g. "Aneks 1 - Obrazac za cijenu ponude", "ANEKS 14."
    const annexHeadingPattern = /(?:^|\n)\s*(Aneks|ANEKS)\s+(\d+)\.?\s*[-–:]?\s*([^\n]{0,100})/gi;
    let match;
    while ((match = annexHeadingPattern.exec(block.text)) !== null) {
      const num = match[2];
      const title = match[3]?.trim();
      const key = `aneks_${num}`;
      if (!found.has(key)) {
        const fullName = title
          ? `Aneks ${num} - ${title}`
          : `Aneks ${num}`;
        found.set(key, {
          name: fullName,
          description: `Obrazac/aneks iz tenderske dokumentacije koji ponuđač mora popuniti i priložiti uz ponudu.`,
          page_number: block.pageNumber,
          page_reference: `Stranica ${block.pageNumber}`,
          source_text: match[0].trim().slice(0, 200),
        });
      }
    }

    // Pattern 2: Inline references "(Aneks X)" or "u Aneksu X" or "dat je u Aneksu X"
    // e.g. "Obrazac i tekst Izjave dat je u Aneksu 11."
    const annexRefPattern = /(?:u\s+)?(?:Aneks(?:u)?|aneks(?:u)?)\s+(\d+)/gi;
    while ((match = annexRefPattern.exec(block.text)) !== null) {
      const num = match[1];
      const key = `aneks_${num}`;
      if (!found.has(key)) {
        // Extract surrounding context (up to 150 chars before and after)
        const start = Math.max(0, match.index - 100);
        const end = Math.min(block.text.length, match.index + match[0].length + 100);
        const context = block.text.slice(start, end).replace(/\n/g, " ").trim();

        found.set(key, {
          name: `Aneks ${num}`,
          description: `Obrazac/aneks referenciran u tenderskoj dokumentaciji. Ponuđač ga mora popuniti i priložiti.`,
          page_number: block.pageNumber,
          page_reference: `Stranica ${block.pageNumber}`,
          source_text: context.slice(0, 200),
        });
      }
    }

    // Pattern 3: "Obrazac za ..." or "OBRAZAC ZA ..."
    const formPattern = /(?:^|\n)\s*(Obrazac|OBRAZAC)\s+(za\s+[^\n]{5,80}|ponude[^\n]{0,50}|izjave?[^\n]{0,50})/gi;
    while ((match = formPattern.exec(block.text)) !== null) {
      const fullMatch = match[0].trim();
      const key = `obrazac_${fullMatch.toLowerCase().replace(/\s+/g, "_").slice(0, 40)}`;
      if (!found.has(key)) {
        found.set(key, {
          name: fullMatch.slice(0, 80),
          description: `Obrazac iz tenderske dokumentacije koji ponuđač mora popuniti i priložiti uz ponudu.`,
          page_number: block.pageNumber,
          page_reference: `Stranica ${block.pageNumber}`,
          source_text: fullMatch.slice(0, 200),
        });
      }
    }

    // Pattern 4: "Prilog X" or "PRILOG X"
    const prilogPattern = /(?:^|\n)\s*(Prilog|PRILOG)\s+(\d+|[A-Z])\.?\s*[-–:]?\s*([^\n]{0,100})/gi;
    while ((match = prilogPattern.exec(block.text)) !== null) {
      const id = match[2];
      const title = match[3]?.trim();
      const key = `prilog_${id.toLowerCase()}`;
      if (!found.has(key)) {
        const fullName = title
          ? `Prilog ${id} - ${title}`
          : `Prilog ${id}`;
        found.set(key, {
          name: fullName,
          description: `Prilog iz tenderske dokumentacije koji ponuđač mora dostaviti.`,
          page_number: block.pageNumber,
          page_reference: `Stranica ${block.pageNumber}`,
          source_text: match[0].trim().slice(0, 200),
        });
      }
    }
  }

  return Array.from(found.values());
}

/**
 * Merge scanned annexes into the AI analysis results.
 * Only adds annexes that the AI didn't already identify.
 */
export function mergeAnnexesIntoChecklist(
  aiItems: Array<{ name: string; document_type: string }>,
  scannedAnnexes: ScannedAnnex[],
): ScannedAnnex[] {
  const missing: ScannedAnnex[] = [];

  for (const annex of scannedAnnexes) {
    // Check if AI already has this annex (fuzzy match on annex number)
    const annexNumMatch = annex.name.match(/\d+/);
    const annexNum = annexNumMatch ? annexNumMatch[0] : null;

    const alreadyExists = aiItems.some((item) => {
      if (item.document_type !== "form") return false;
      const itemName = item.name.toLowerCase();
      const annexName = annex.name.toLowerCase();

      // Exact number match
      if (annexNum) {
        const itemNumMatch = itemName.match(/\d+/);
        if (itemNumMatch && itemNumMatch[0] === annexNum) return true;
      }

      // Fuzzy name match
      return (
        itemName.includes(annexName) ||
        annexName.includes(itemName) ||
        levenshteinSimilarity(itemName, annexName) > 0.6
      );
    });

    if (!alreadyExists) {
      missing.push(annex);
    }
  }

  return missing;
}

// ─── Helpers ───

interface PageBlock {
  pageNumber: number;
  text: string;
}

function splitIntoPages(fullText: string): PageBlock[] {
  const blocks: PageBlock[] = [];
  const parts = fullText.split(/\[Stranica (\d+)\]/);

  // parts[0] is before first marker (usually empty)
  // parts[1] = page number, parts[2] = text, etc.
  for (let i = 1; i < parts.length; i += 2) {
    const pageNumber = parseInt(parts[i], 10);
    const text = parts[i + 1] || "";
    blocks.push({ pageNumber, text });
  }

  // If no markers found, treat entire text as page 1
  if (blocks.length === 0 && fullText.trim()) {
    blocks.push({ pageNumber: 1, text: fullText });
  }

  return blocks;
}

function levenshteinSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  const distance = levenshtein(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}
