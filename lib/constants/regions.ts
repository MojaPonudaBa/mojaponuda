export interface RegionGroup {
  label: string;
  parentRegion?: string;
  municipalities: string[];
}

export const BIH_REGION_GROUPS: RegionGroup[] = [
  {
    label: "Unsko-sanski kanton",
    parentRegion: "Unsko-sanski kanton",
    municipalities: [
      "Bihać",
      "Bosanska Krupa",
      "Bosanski Petrovac",
      "Bužim",
      "Cazin",
      "Ključ",
      "Sanski Most",
      "Velika Kladuša",
    ],
  },
  {
    label: "Posavski kanton",
    parentRegion: "Posavski kanton",
    municipalities: ["Domaljevac-Šamac", "Odžak", "Orašje"],
  },
  {
    label: "Tuzlanski kanton",
    parentRegion: "Tuzlanski kanton",
    municipalities: [
      "Banovići",
      "Čelić",
      "Doboj Istok",
      "Gračanica",
      "Gradačac",
      "Kalesija",
      "Kladanj",
      "Lukavac",
      "Sapna",
      "Srebrenik",
      "Teočak",
      "Tuzla",
      "Živinice",
    ],
  },
  {
    label: "Zeničko-dobojski kanton",
    parentRegion: "Zeničko-dobojski kanton",
    municipalities: [
      "Breza",
      "Doboj Jug",
      "Kakanj",
      "Maglaj",
      "Olovo",
      "Tešanj",
      "Usora",
      "Vareš",
      "Visoko",
      "Zavidovići",
      "Zenica",
      "Žepče",
    ],
  },
  {
    label: "Bosansko-podrinjski kanton",
    parentRegion: "Bosansko-podrinjski kanton",
    municipalities: ["Foča-Ustikolina", "Goražde", "Pale-Prača"],
  },
  {
    label: "Srednjobosanski kanton",
    parentRegion: "Srednjobosanski kanton",
    municipalities: [
      "Bugojno",
      "Busovača",
      "Dobretići",
      "Donji Vakuf",
      "Fojnica",
      "Gornji Vakuf-Uskoplje",
      "Jajce",
      "Kiseljak",
      "Kreševo",
      "Novi Travnik",
      "Travnik",
      "Vitez",
    ],
  },
  {
    label: "Hercegovačko-neretvanski kanton",
    parentRegion: "Hercegovačko-neretvanski kanton",
    municipalities: [
      "Čapljina",
      "Čitluk",
      "Jablanica",
      "Konjic",
      "Mostar",
      "Neum",
      "Prozor-Rama",
      "Ravno",
      "Stolac",
    ],
  },
  {
    label: "Zapadnohercegovački kanton",
    parentRegion: "Zapadnohercegovački kanton",
    municipalities: ["Grude", "Ljubuški", "Posušje", "Široki Brijeg"],
  },
  {
    label: "Kanton Sarajevo",
    parentRegion: "Kanton Sarajevo",
    municipalities: [
      "Sarajevo",
      "Centar Sarajevo",
      "Hadžići",
      "Ilidža",
      "Ilijaš",
      "Novi Grad Sarajevo",
      "Novo Sarajevo",
      "Stari Grad Sarajevo",
      "Trnovo (FBiH)",
      "Vogošća",
    ],
  },
  {
    label: "Kanton 10",
    parentRegion: "Kanton 10",
    municipalities: [
      "Bosansko Grahovo",
      "Drvar",
      "Glamoč",
      "Kupres",
      "Livno",
      "Tomislavgrad",
    ],
  },
  {
    label: "Brčko distrikt",
    parentRegion: "Brčko distrikt",
    municipalities: ["Brčko"],
  },
  {
    label: "Republika Srpska · Krajina i Banja Luka",
    municipalities: [
      "Banja Luka",
      "Čelinac",
      "Gradiška",
      "Jezero",
      "Kneževo",
      "Kostajnica",
      "Kotor Varoš",
      "Kozarska Dubica",
      "Krupa na Uni",
      "Kupres (RS)",
      "Laktaši",
      "Mrkonjić Grad",
      "Novi Grad",
      "Oštra Luka",
      "Petrovac",
      "Prijedor",
      "Prnjavor",
      "Ribnik",
      "Srbac",
      "Šipovo",
    ],
  },
  {
    label: "Republika Srpska · Doboj, Posavina i Semberija",
    municipalities: [
      "Bijeljina",
      "Brod",
      "Derventa",
      "Doboj",
      "Donji Žabar",
      "Lopare",
      "Modriča",
      "Osmaci",
      "Pelagićevo",
      "Petrovo",
      "Šamac",
      "Stanari",
      "Teslić",
      "Ugljevik",
      "Vukosavlje",
      "Zvornik",
    ],
  },
  {
    label: "Republika Srpska · Romanija i Podrinje",
    municipalities: [
      "Istočno Sarajevo",
      "Istočna Ilidža",
      "Istočno Novo Sarajevo",
      "Istočni Stari Grad",
      "Pale",
      "Sokolac",
      "Trnovo (RS)",
      "Bratunac",
      "Čajniče",
      "Foča",
      "Han Pijesak",
      "Kalinovik",
      "Milići",
      "Novo Goražde",
      "Rogatica",
      "Rudo",
      "Srebrenica",
      "Šekovići",
      "Višegrad",
      "Vlasenica",
    ],
  },
  {
    label: "Republika Srpska · Hercegovina",
    municipalities: [
      "Berkovići",
      "Bileća",
      "Gacko",
      "Istočni Drvar",
      "Istočni Mostar",
      "Ljubinje",
      "Nevesinje",
      "Trebinje",
    ],
  },
];

 const REGION_GROUP_NEIGHBORS: Record<string, string[]> = {
   "Unsko-sanski kanton": ["Kanton 10", "Republika Srpska · Krajina i Banja Luka"],
   "Posavski kanton": ["Tuzlanski kanton", "Brčko distrikt", "Republika Srpska · Doboj, Posavina i Semberija"],
   "Tuzlanski kanton": [
     "Posavski kanton",
     "Zeničko-dobojski kanton",
     "Brčko distrikt",
     "Republika Srpska · Doboj, Posavina i Semberija",
   ],
   "Zeničko-dobojski kanton": [
     "Tuzlanski kanton",
     "Srednjobosanski kanton",
     "Kanton Sarajevo",
     "Bosansko-podrinjski kanton",
     "Hercegovačko-neretvanski kanton",
     "Republika Srpska · Doboj, Posavina i Semberija",
     "Republika Srpska · Romanija i Podrinje",
   ],
   "Bosansko-podrinjski kanton": [
     "Kanton Sarajevo",
     "Zeničko-dobojski kanton",
     "Hercegovačko-neretvanski kanton",
     "Republika Srpska · Romanija i Podrinje",
   ],
   "Srednjobosanski kanton": [
     "Zeničko-dobojski kanton",
     "Kanton Sarajevo",
     "Hercegovačko-neretvanski kanton",
     "Kanton 10",
     "Republika Srpska · Krajina i Banja Luka",
   ],
   "Hercegovačko-neretvanski kanton": [
     "Srednjobosanski kanton",
     "Kanton Sarajevo",
     "Bosansko-podrinjski kanton",
     "Zapadnohercegovački kanton",
     "Kanton 10",
     "Republika Srpska · Romanija i Podrinje",
     "Republika Srpska · Hercegovina",
   ],
   "Zapadnohercegovački kanton": ["Hercegovačko-neretvanski kanton", "Kanton 10"],
   "Kanton Sarajevo": [
     "Srednjobosanski kanton",
     "Zeničko-dobojski kanton",
     "Bosansko-podrinjski kanton",
     "Hercegovačko-neretvanski kanton",
     "Republika Srpska · Romanija i Podrinje",
   ],
   "Kanton 10": [
     "Unsko-sanski kanton",
     "Srednjobosanski kanton",
     "Hercegovačko-neretvanski kanton",
     "Zapadnohercegovački kanton",
     "Republika Srpska · Krajina i Banja Luka",
     "Republika Srpska · Hercegovina",
   ],
   "Brčko distrikt": ["Posavski kanton", "Tuzlanski kanton", "Republika Srpska · Doboj, Posavina i Semberija"],
   "Republika Srpska · Krajina i Banja Luka": [
     "Unsko-sanski kanton",
     "Srednjobosanski kanton",
     "Kanton 10",
     "Zeničko-dobojski kanton",
     "Republika Srpska · Doboj, Posavina i Semberija",
   ],
   "Republika Srpska · Doboj, Posavina i Semberija": [
     "Posavski kanton",
     "Tuzlanski kanton",
     "Zeničko-dobojski kanton",
     "Brčko distrikt",
     "Republika Srpska · Krajina i Banja Luka",
     "Republika Srpska · Romanija i Podrinje",
   ],
   "Republika Srpska · Romanija i Podrinje": [
     "Kanton Sarajevo",
     "Bosansko-podrinjski kanton",
     "Zeničko-dobojski kanton",
     "Hercegovačko-neretvanski kanton",
     "Republika Srpska · Doboj, Posavina i Semberija",
     "Republika Srpska · Hercegovina",
   ],
   "Republika Srpska · Hercegovina": [
     "Hercegovačko-neretvanski kanton",
     "Kanton 10",
     "Republika Srpska · Romanija i Podrinje",
   ],
 };

function uniqueRegions(regions: Array<string | null | undefined>): string[] {
  return [...new Set(regions.map((region) => region?.trim()).filter(Boolean) as string[])];
}

const parentToMunicipalities = new Map(
  BIH_REGION_GROUPS.filter((group) => group.parentRegion).map((group) => [group.parentRegion as string, group.municipalities])
);

 const groupKeyToMunicipalities = new Map(
   BIH_REGION_GROUPS.map((group) => [group.parentRegion ?? group.label, group.municipalities])
 );

 const municipalityToGroupKey = new Map(
   BIH_REGION_GROUPS.flatMap((group) =>
     group.municipalities.map((municipality) => [municipality, group.parentRegion ?? group.label] as const)
   )
 );

const allMunicipalities = new Set(BIH_REGION_GROUPS.flatMap((group) => group.municipalities));

export function expandSelectedRegions(selectedRegions: string[]): string[] {
  const expanded = new Set<string>();

  for (const region of selectedRegions) {
    const municipalities = parentToMunicipalities.get(region);

    if (municipalities) {
      municipalities.forEach((municipality) => expanded.add(municipality));
      continue;
    }

    expanded.add(region);
  }

  return [...expanded];
}

export function buildRegionSearchTerms(selectedRegions: string[]): string[] {
  const expanded = expandSelectedRegions(selectedRegions);
  const searchTerms = new Set(expanded);

  for (const group of BIH_REGION_GROUPS) {
    if (!group.parentRegion) {
      continue;
    }

    const isWholeGroupSelected = group.municipalities.every((municipality) => expanded.includes(municipality));

    if (isWholeGroupSelected) {
      searchTerms.add(group.parentRegion);
    }
  }

  return [...searchTerms];
}

export function buildSameGroupRegionFallback(selectedRegions: string[]): string[] {
  const expanded = expandSelectedRegions(selectedRegions);
  const selectedRegionSet = new Set(expanded);
  const selectedGroupKeys = new Set(
    expanded
      .map((region) => municipalityToGroupKey.get(region))
      .filter(Boolean) as string[]
  );
  const sameGroupRegions = new Set<string>();

  selectedGroupKeys.forEach((groupKey) => {
    (groupKeyToMunicipalities.get(groupKey) ?? []).forEach((municipality) => {
      if (!selectedRegionSet.has(municipality)) {
        sameGroupRegions.add(municipality);
      }
    });
  });

  return [...sameGroupRegions];
}

export function buildNeighboringGroupRegionFallback(selectedRegions: string[]): string[] {
  const expanded = expandSelectedRegions(selectedRegions);
  const selectedRegionSet = new Set(expanded);
  const selectedGroupKeys = new Set(
    BIH_REGION_GROUPS.map((group) => group.parentRegion ?? group.label).filter((groupKey) => {
      const municipalities = groupKeyToMunicipalities.get(groupKey) ?? [];
      return municipalities.length > 0 && municipalities.every((municipality) => selectedRegionSet.has(municipality));
    })
  );
  const neighboringRegions = new Set<string>();

  selectedGroupKeys.forEach((groupKey) => {
    (REGION_GROUP_NEIGHBORS[groupKey] ?? []).forEach((neighborKey) => {
      (groupKeyToMunicipalities.get(neighborKey) ?? []).forEach((municipality) => {
        if (!selectedRegionSet.has(municipality)) {
          neighboringRegions.add(municipality);
        }
      });
    });
  });

  return [...neighboringRegions];
}

export function getRegionSelectionLabels(selectedRegions: string[]): string[] {
  const expanded = expandSelectedRegions(selectedRegions);
  const labels: string[] = [];
  const coveredMunicipalities = new Set<string>();

  for (const group of BIH_REGION_GROUPS) {
    const selectedMunicipalities = group.municipalities.filter((municipality) => expanded.includes(municipality));

    if (selectedMunicipalities.length === 0) {
      continue;
    }

    const isWholeGroupSelected = selectedMunicipalities.length === group.municipalities.length;

    if (group.parentRegion && isWholeGroupSelected) {
      labels.push(group.parentRegion);
      group.municipalities.forEach((municipality) => coveredMunicipalities.add(municipality));
      continue;
    }

    selectedMunicipalities.forEach((municipality) => {
      labels.push(municipality);
      coveredMunicipalities.add(municipality);
    });
  }

  expanded.forEach((region) => {
    if (!coveredMunicipalities.has(region) && !allMunicipalities.has(region)) {
      labels.push(region);
    }
  });

  return uniqueRegions(labels);
}

export const BIH_REGIONS = uniqueRegions([
  ...BIH_REGION_GROUPS.flatMap((group) => (group.parentRegion ? [group.parentRegion, ...group.municipalities] : group.municipalities)),
]);
