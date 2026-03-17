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

function uniqueRegions(regions: Array<string | null | undefined>): string[] {
  return [...new Set(regions.map((region) => region?.trim()).filter(Boolean) as string[])];
}

const parentToMunicipalities = new Map(
  BIH_REGION_GROUPS.filter((group) => group.parentRegion).map((group) => [group.parentRegion as string, group.municipalities])
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
