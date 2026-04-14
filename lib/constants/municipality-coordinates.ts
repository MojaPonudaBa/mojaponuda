/**
 * Approximate geographic center coordinates (lat, lng) for every
 * municipality / city in Bosnia and Herzegovina.
 *
 * Sources: OpenStreetMap Nominatim centroids, cross-checked against
 * the official BiH administrative map.
 *
 * Keys are lowercase, diacritic-stripped for fuzzy matching.
 */

export interface MunicipalityCoords {
  lat: number;
  lng: number;
}

function repairCommonMojibake(value: string): string {
  return value
    .replace(/Ä/g, "č")
    .replace(/Ä‡/g, "ć")
    .replace(/Å¡/g, "š")
    .replace(/Å¾/g, "ž")
    .replace(/Ä‘/g, "đ")
    .replace(/Ä/g, "Đ")
    .replace(/Â·/g, "·")
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/â€ž|â€œ/g, "\"")
    .replace(/â€™/g, "'");
}

// Primary lookup: exact name → coords
export const MUNICIPALITY_COORDS: Record<string, MunicipalityCoords> = {
  // Canton / region centroids (for when operating_regions stores canton names)
  "Unsko-sanski kanton": { lat: 44.817, lng: 15.870 },
  "Posavski kanton": { lat: 45.033, lng: 18.500 },
  "Tuzlanski kanton": { lat: 44.538, lng: 18.673 },
  "Zeničko-dobojski kanton": { lat: 44.300, lng: 18.050 },
  "Bosansko-podrinjski kanton": { lat: 43.667, lng: 18.983 },
  "Srednjobosanski kanton": { lat: 44.100, lng: 17.600 },
  "Hercegovačko-neretvanski kanton": { lat: 43.400, lng: 17.800 },
  "Zapadnohercegovački kanton": { lat: 43.350, lng: 17.600 },
  "Kanton Sarajevo": { lat: 43.848, lng: 18.356 },
  "Kanton 10": { lat: 43.900, lng: 17.100 },
  "Brčko distrikt": { lat: 44.867, lng: 18.817 },
  "Republika Srpska": { lat: 44.500, lng: 17.500 },
  "Republika Srpska · Krajina i Banja Luka": { lat: 44.775, lng: 17.191 },
  "Republika Srpska · Doboj, Posavina i Semberija": { lat: 44.800, lng: 18.200 },
  "Republika Srpska · Romanija i Podrinje": { lat: 44.000, lng: 18.800 },
  "Republika Srpska · Hercegovina": { lat: 43.100, lng: 18.300 },

  // Unsko-sanski kanton
  "Bihać": { lat: 44.817, lng: 15.870 },
  "Bosanska Krupa": { lat: 44.882, lng: 16.152 },
  "Bosanski Petrovac": { lat: 44.550, lng: 16.370 },
  "Bužim": { lat: 45.103, lng: 15.999 },
  "Cazin": { lat: 45.228, lng: 15.943 },
  "Ključ": { lat: 44.527, lng: 16.773 },
  "Sanski Most": { lat: 44.767, lng: 16.667 },
  "Velika Kladuša": { lat: 45.183, lng: 15.800 },

  // Posavski kanton
  "Domaljevac-Šamac": { lat: 45.067, lng: 18.433 },
  "Odžak": { lat: 45.017, lng: 18.317 },
  "Orašje": { lat: 45.033, lng: 18.700 },

  // Tuzlanski kanton
  "Banovići": { lat: 44.400, lng: 18.533 },
  "Čelić": { lat: 44.717, lng: 18.817 },
  "Doboj Istok": { lat: 44.733, lng: 18.083 },
  "Gračanica": { lat: 44.700, lng: 18.300 },
  "Gradačac": { lat: 44.883, lng: 18.433 },
  "Kalesija": { lat: 44.467, lng: 18.450 },
  "Kladanj": { lat: 44.233, lng: 18.683 },
  "Lukavac": { lat: 44.550, lng: 18.517 },
  "Sapna": { lat: 44.483, lng: 18.967 },
  "Srebrenik": { lat: 44.700, lng: 18.483 },
  "Teočak": { lat: 44.550, lng: 18.967 },
  "Tuzla": { lat: 44.538, lng: 18.673 },
  "Živinice": { lat: 44.450, lng: 18.650 },

  // Zeničko-dobojski kanton
  "Breza": { lat: 44.017, lng: 18.267 },
  "Doboj Jug": { lat: 44.733, lng: 18.083 },
  "Kakanj": { lat: 44.133, lng: 18.117 },
  "Maglaj": { lat: 44.550, lng: 18.100 },
  "Olovo": { lat: 44.133, lng: 18.583 },
  "Tešanj": { lat: 44.617, lng: 17.983 },
  "Usora": { lat: 44.650, lng: 17.917 },
  "Vareš": { lat: 44.167, lng: 18.333 },
  "Visoko": { lat: 44.000, lng: 18.183 },
  "Zavidovići": { lat: 44.450, lng: 18.150 },
  "Zenica": { lat: 44.203, lng: 17.908 },
  "Žepče": { lat: 44.433, lng: 18.033 },

  // Bosansko-podrinjski kanton
  "Foča-Ustikolina": { lat: 43.683, lng: 18.783 },
  "Goražde": { lat: 43.667, lng: 18.983 },
  "Pale-Prača": { lat: 43.817, lng: 18.567 },

  // Srednjobosanski kanton
  "Bugojno": { lat: 44.050, lng: 17.450 },
  "Busovača": { lat: 44.100, lng: 17.883 },
  "Dobretići": { lat: 44.383, lng: 17.483 },
  "Donji Vakuf": { lat: 44.133, lng: 17.400 },
  "Fojnica": { lat: 43.967, lng: 17.900 },
  "Gornji Vakuf-Uskoplje": { lat: 43.933, lng: 17.583 },
  "Jajce": { lat: 44.342, lng: 17.268 },
  "Kiseljak": { lat: 43.950, lng: 18.083 },
  "Kreševo": { lat: 43.883, lng: 18.000 },
  "Novi Travnik": { lat: 44.167, lng: 17.667 },
  "Travnik": { lat: 44.225, lng: 17.665 },
  "Vitez": { lat: 44.158, lng: 17.783 },

  // Hercegovačko-neretvanski kanton
  "Čapljina": { lat: 43.117, lng: 17.717 },
  "Čitluk": { lat: 43.183, lng: 17.633 },
  "Jablanica": { lat: 43.667, lng: 17.750 },
  "Konjic": { lat: 43.650, lng: 17.967 },
  "Mostar": { lat: 43.343, lng: 17.808 },
  "Neum": { lat: 42.917, lng: 17.617 },
  "Prozor-Rama": { lat: 43.817, lng: 17.600 },
  "Ravno": { lat: 42.883, lng: 17.967 },
  "Stolac": { lat: 43.083, lng: 17.950 },

  // Zapadnohercegovački kanton
  "Grude": { lat: 43.367, lng: 17.683 },
  "Ljubuški": { lat: 43.200, lng: 17.550 },
  "Posušje": { lat: 43.467, lng: 17.317 },
  "Široki Brijeg": { lat: 43.383, lng: 17.600 },

  // Kanton Sarajevo
  "Sarajevo": { lat: 43.848, lng: 18.356 },
  "Centar Sarajevo": { lat: 43.858, lng: 18.412 },
  "Hadžići": { lat: 43.817, lng: 18.200 },
  "Ilidža": { lat: 43.833, lng: 18.300 },
  "Ilijaš": { lat: 44.000, lng: 18.267 },
  "Novi Grad Sarajevo": { lat: 43.850, lng: 18.350 },
  "Novo Sarajevo": { lat: 43.850, lng: 18.383 },
  "Stari Grad Sarajevo": { lat: 43.860, lng: 18.433 },
  "Trnovo (FBiH)": { lat: 43.617, lng: 18.333 },
  "Vogošća": { lat: 43.917, lng: 18.350 },

  // Kanton 10
  "Bosansko Grahovo": { lat: 44.183, lng: 16.383 },
  "Drvar": { lat: 44.367, lng: 16.383 },
  "Glamoč": { lat: 44.033, lng: 16.850 },
  "Kupres": { lat: 43.983, lng: 17.267 },
  "Livno": { lat: 43.817, lng: 17.000 },
  "Tomislavgrad": { lat: 43.717, lng: 17.217 },

  // Brčko distrikt
  "Brčko": { lat: 44.867, lng: 18.817 },

  // RS · Krajina i Banja Luka
  "Banja Luka": { lat: 44.775, lng: 17.191 },
  "Čelinac": { lat: 44.717, lng: 17.317 },
  "Gradiška": { lat: 45.150, lng: 17.250 },
  "Jezero": { lat: 44.350, lng: 17.183 },
  "Kneževo": { lat: 44.483, lng: 17.367 },
  "Kostajnica": { lat: 45.217, lng: 16.550 },
  "Kotor Varoš": { lat: 44.617, lng: 17.367 },
  "Kozarska Dubica": { lat: 45.183, lng: 16.800 },
  "Krupa na Uni": { lat: 44.883, lng: 16.283 },
  "Kupres (RS)": { lat: 43.983, lng: 17.267 },
  "Laktaši": { lat: 44.900, lng: 17.300 },
  "Mrkonjić Grad": { lat: 44.417, lng: 17.083 },
  "Novi Grad": { lat: 45.050, lng: 16.383 },
  "Oštra Luka": { lat: 44.833, lng: 16.733 },
  "Petrovac": { lat: 44.550, lng: 16.370 },
  "Prijedor": { lat: 44.983, lng: 16.717 },
  "Prnjavor": { lat: 44.867, lng: 17.667 },
  "Ribnik": { lat: 44.533, lng: 16.950 },
  "Srbac": { lat: 45.100, lng: 17.533 },
  "Šipovo": { lat: 44.300, lng: 17.083 },

  // RS · Doboj, Posavina i Semberija
  "Bijeljina": { lat: 44.750, lng: 19.217 },
  "Brod": { lat: 45.133, lng: 17.983 },
  "Derventa": { lat: 44.983, lng: 17.917 },
  "Doboj": { lat: 44.733, lng: 18.083 },
  "Donji Žabar": { lat: 45.033, lng: 18.617 },
  "Lopare": { lat: 44.633, lng: 18.850 },
  "Modriča": { lat: 44.950, lng: 18.300 },
  "Osmaci": { lat: 44.383, lng: 18.983 },
  "Pelagićevo": { lat: 44.900, lng: 18.633 },
  "Petrovo": { lat: 44.617, lng: 18.383 },
  "Šamac": { lat: 45.067, lng: 18.433 },
  "Stanari": { lat: 44.683, lng: 17.717 },
  "Teslić": { lat: 44.600, lng: 17.867 },
  "Ugljevik": { lat: 44.683, lng: 18.983 },
  "Vukosavlje": { lat: 44.967, lng: 18.117 },
  "Zvornik": { lat: 44.383, lng: 19.100 },

  // RS · Romanija i Podrinje
  "Istočno Sarajevo": { lat: 43.817, lng: 18.433 },
  "Istočna Ilidža": { lat: 43.817, lng: 18.367 },
  "Istočno Novo Sarajevo": { lat: 43.833, lng: 18.417 },
  "Istočni Stari Grad": { lat: 43.850, lng: 18.450 },
  "Pale": { lat: 43.817, lng: 18.567 },
  "Sokolac": { lat: 43.933, lng: 18.800 },
  "Trnovo (RS)": { lat: 43.617, lng: 18.333 },
  "Bratunac": { lat: 44.183, lng: 19.333 },
  "Čajniče": { lat: 43.550, lng: 19.067 },
  "Foča": { lat: 43.500, lng: 18.783 },
  "Han Pijesak": { lat: 44.083, lng: 18.967 },
  "Kalinovik": { lat: 43.517, lng: 18.433 },
  "Milići": { lat: 44.167, lng: 19.100 },
  "Novo Goražde": { lat: 43.650, lng: 18.983 },
  "Rogatica": { lat: 43.800, lng: 19.000 },
  "Rudo": { lat: 43.617, lng: 19.383 },
  "Srebrenica": { lat: 44.100, lng: 19.300 },
  "Šekovići": { lat: 44.300, lng: 18.850 },
  "Višegrad": { lat: 43.783, lng: 19.283 },
  "Vlasenica": { lat: 44.183, lng: 18.950 },

  // RS · Hercegovina
  "Berkovići": { lat: 43.150, lng: 18.017 },
  "Bileća": { lat: 42.883, lng: 18.433 },
  "Gacko": { lat: 43.167, lng: 18.533 },
  "Istočni Drvar": { lat: 44.367, lng: 16.383 },
  "Istočni Mostar": { lat: 43.350, lng: 17.833 },
  "Ljubinje": { lat: 42.950, lng: 18.100 },
  "Nevesinje": { lat: 43.267, lng: 18.117 },
  "Trebinje": { lat: 42.711, lng: 18.344 },
};

/**
 * Haversine distance between two lat/lng points, returns km.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Normalize a place name for fuzzy lookup:
 * lowercase, strip common diacritics, trim.
 */
function normalizeName(name: string): string {
  return repairCommonMojibake(name)
    .trim()
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/dž/g, "dz")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Build a normalized lookup map once
const NORMALIZED_LOOKUP = new Map<string, MunicipalityCoords>(
  Object.entries(MUNICIPALITY_COORDS).map(([name, coords]) => [
    normalizeName(name),
    coords,
  ])
);

const NORMALIZED_ALIASES = new Map<string, string>([
  ["banjaluka", "banja luka"],
  ["grad banja luka", "banja luka"],
  ["grad sarajevo", "sarajevo"],
  ["brcko", "brcko"],
  ["brcko distrikt bih", "brcko distrikt"],
  ["brcko distrikt bosne i hercegovine", "brcko distrikt"],
  ["sarajevo centar", "centar sarajevo"],
  ["sarajevo novi grad", "novi grad sarajevo"],
  ["sarajevo stari grad", "stari grad sarajevo"],
  ["sarajevo novo", "novo sarajevo"],
  ["istocna ilidza", "istocna ilidza"],
  ["istocno novo sarajevo", "istocno novo sarajevo"],
  ["istocni stari grad", "istocni stari grad"],
  ["domaljevac samac", "domaljevac samac"],
  ["trnovo fbih", "trnovo fbih"],
  ["trnovo rs", "trnovo rs"],
]);

const NORMALIZED_ENTRIES = [...NORMALIZED_LOOKUP.entries()].sort(
  (left, right) => right[0].length - left[0].length
);

/**
 * Look up coordinates for a place name string.
 * Tries exact match first, then normalized fuzzy match.
 * Returns null if not found.
 */
export function getCoordsForPlace(name: string | null | undefined): MunicipalityCoords | null {
  if (!name?.trim()) return null;
  const trimmed = repairCommonMojibake(name.trim());
  // Exact match
  if (MUNICIPALITY_COORDS[trimmed]) return MUNICIPALITY_COORDS[trimmed];
  // Normalized match
  const norm = normalizeName(trimmed);
  const aliased = NORMALIZED_ALIASES.get(norm) ?? norm;
  const direct = NORMALIZED_LOOKUP.get(aliased);
  if (direct) {
    return direct;
  }

  for (const [candidate, coords] of NORMALIZED_ENTRIES) {
    if (candidate.length < 4) continue;
    if (aliased.includes(candidate)) {
      return coords;
    }
  }

  return null;
}

/**
 * Given a list of selected region names (municipalities or canton names),
 * return their average center coordinate.
 * Expands canton names to their municipalities first.
 * Used as the "user location" anchor point.
 */
export function getAnchorCoords(selectedRegions: string[]): MunicipalityCoords | null {
  const expanded: string[] = [];
  for (const r of selectedRegions) {
    // Try direct lookup first
    if (getCoordsForPlace(r)) {
      expanded.push(r);
      continue;
    }
    // Try to expand canton → municipalities using the region groups
    // Import is circular so we inline a simple expansion:
    // If the name contains "kanton" or "republika srpska", try word-by-word
    const words = r.split(/[\s\-–·]+/).filter((w) => w.length >= 4);
    let found = false;
    for (const word of words) {
      if (getCoordsForPlace(word)) {
        expanded.push(word);
        found = true;
        break;
      }
    }
    if (!found) {
      // Last resort: add the original, getCoordsForPlace will return null
      expanded.push(r);
    }
  }

  const coords = expanded
    .flatMap((r) => {
      const c = getCoordsForPlace(r);
      return c ? [c] : [];
    });
  if (coords.length === 0) return null;
  return {
    lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
    lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length,
  };
}

/**
 * Distance-based location priority (replaces tier system):
 *   0  →  0–50 km   (local)
 *   1  →  50–120 km (regional)
 *   2  →  120–250 km (wider area)
 *   3  →  250 km+   (national)
 */
export function distanceToLocationPriority(km: number): number {
  if (km <= 50) return 0;
  if (km <= 120) return 1;
  if (km <= 250) return 2;
  return 3;
}
