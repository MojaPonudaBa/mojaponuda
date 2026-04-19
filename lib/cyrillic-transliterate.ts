/**
 * Transliteracija BHS latinice ↔ ćirilice za potrebe retrieval-a.
 *
 * Naslovi tendera iz Republike Srpske i dijela Federacije dolaze na
 * ćirilici ("Набавка возила", "Изградња јавне расвјете"). Naši keyword
 * seeds (u `lib/company-profile.ts`) su latinični ("vozil", "izgradnj"),
 * pa ILIKE ne pronalazi podudarnost. Da bismo uhvatili obje varijante
 * bez migracije baze, za svaki latinični seed generišemo i ćiriličnu
 * verziju i upotrebljavamo obje u `or()` uslovu.
 */

// Dvoslovi PRVO — mora se preslikati prije pojedinačnih slova.
const LATIN_TO_CYRILLIC_DIGRAPHS: Array<[string, string]> = [
  ["dž", "џ"],
  ["Dž", "Џ"],
  ["DŽ", "Џ"],
  ["lj", "љ"],
  ["Lj", "Љ"],
  ["LJ", "Љ"],
  ["nj", "њ"],
  ["Nj", "Њ"],
  ["NJ", "Њ"],
];

const LATIN_TO_CYRILLIC_LETTERS: Record<string, string> = {
  a: "а", b: "б", c: "ц", č: "ч", ć: "ћ", d: "д", đ: "ђ",
  e: "е", f: "ф", g: "г", h: "х", i: "и", j: "ј", k: "к",
  l: "л", m: "м", n: "н", o: "о", p: "п", r: "р", s: "с",
  š: "ш", t: "т", u: "у", v: "в", z: "з", ž: "ж",
  A: "А", B: "Б", C: "Ц", Č: "Ч", Ć: "Ћ", D: "Д", Đ: "Ђ",
  E: "Е", F: "Ф", G: "Г", H: "Х", I: "И", J: "Ј", K: "К",
  L: "Л", M: "М", N: "Н", O: "О", P: "П", R: "Р", S: "С",
  Š: "Ш", T: "Т", U: "У", V: "В", Z: "З", Ž: "Ж",
};

export function latinToCyrillic(input: string): string {
  let out = input;
  for (const [from, to] of LATIN_TO_CYRILLIC_DIGRAPHS) {
    out = out.split(from).join(to);
  }
  let result = "";
  for (const ch of out) {
    result += LATIN_TO_CYRILLIC_LETTERS[ch] ?? ch;
  }
  return result;
}

/**
 * Vraća jedinstven skup varijanti keyword-a: original + ćirilična kopija.
 * Koristi se kada retrieval mora pokriti tenderske naslove pisane
 * latinicom ili ćirilicom bez ikakve promjene u seed tablicama.
 */
export function expandKeywordVariants(keyword: string): string[] {
  const trimmed = keyword.trim();
  if (!trimmed) return [];
  const cyr = latinToCyrillic(trimmed);
  if (cyr === trimmed) return [trimmed];
  return [trimmed, cyr];
}
