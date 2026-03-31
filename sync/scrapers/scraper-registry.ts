/**
 * Centralni registar svih scraper izvora
 * Omogućava pregled i individualno pokretanje svakog izvora
 */

import { scrapeFmrpo } from "./scraper-fbih-ministarstvo";
import { scrapeRazvojneAgencije } from "./scraper-razvojne-agencije";
import { scrapeSingleFederalSource } from "./scraper-federal-sources";
import { scrapeSingleCantonalSource } from "./scraper-cantonal-sources";
import { scrapeSingleMunicipalSource } from "./scraper-municipal-sources";
import { scrapeSingleLegalSource } from "./scraper-legal-updates";
import type { ScraperResult } from "./types";
import type { LegalScraperResult } from "./scraper-legal-updates";

export type ScraperCategory = "opportunities" | "legal";
export type ExecutionLayer = "layer1" | "layer2" | "layer3";

export interface ScraperSource {
  id: string;
  name: string;
  url: string;
  category: ScraperCategory;
  layer: ExecutionLayer;
  description: string;
  enabled: boolean;
}

/**
 * Registar svih izvora koji se scrapeaju
 */
export const SCRAPER_SOURCES: ScraperSource[] = [
  // Layer 1 - Dnevno (Federal sources - high priority)
  {
    id: "fmrpo",
    name: "FMRPO - Federalno ministarstvo razvoja, poduzetništva i obrta",
    url: "https://javnipozivi.fmrpo.gov.ba/",
    category: "opportunities",
    layer: "layer1",
    description: "Javni pozivi za poticaje i grantove",
    enabled: true,
  },
  {
    id: "serda",
    name: "SERDA - Razvojna agencija Sarajevskog kantona",
    url: "https://www.serda.ba/javni-pozivi",
    category: "opportunities",
    layer: "layer1",
    description: "Razvojni programi i poticaji za Sarajevski kanton",
    enabled: true,
  },
  {
    id: "redah",
    name: "REDAH - Razvojna agencija za Hercegovinu",
    url: "https://www.redah.ba/javni-pozivi",
    category: "opportunities",
    layer: "layer1",
    description: "Razvojni programi za Hercegovinu",
    enabled: true,
  },
  {
    id: "fbih-vlada",
    name: "Vlada Federacije BiH",
    url: "https://fbihvlada.gov.ba/bs/javni-pozivi",
    category: "opportunities",
    layer: "layer1",
    description: "Javni pozivi Vlade FBiH",
    enabled: true,
  },
  {
    id: "undp-bih",
    name: "UNDP Bosna i Hercegovina",
    url: "https://javnipoziv.undp.ba/",
    category: "opportunities",
    layer: "layer1",
    description: "UNDP projekti i grantovi",
    enabled: true,
  },
  {
    id: "mcp-bih",
    name: "Ministarstvo civilnih poslova BiH",
    url: "https://www.mcp.gov.ba/publication/read/objavljeni-pozivi-za-dodjelu-grant-sredstava",
    category: "opportunities",
    layer: "layer1",
    description: "Grant sredstva MCP BiH",
    enabled: true,
  },

  // Layer 2 - Sedmično (Svi kantoni + sektorska ministarstva)
  // FBiH kantoni
  {
    id: "kanton-sarajevo",
    name: "Kanton Sarajevo",
    url: "https://www.ks.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Kantona Sarajevo",
    enabled: true,
  },
  {
    id: "kanton-tuzla",
    name: "Tuzlanski kanton",
    url: "https://www.vladatk.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Tuzlanskog kantona",
    enabled: true,
  },
  {
    id: "kanton-zenica",
    name: "Zeničko-dobojski kanton",
    url: "https://www.zdk.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi ZDK",
    enabled: true,
  },
  {
    id: "kanton-hnk",
    name: "Hercegovačko-neretvanski kanton",
    url: "https://www.vladahnk.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi HNK",
    enabled: true,
  },
  {
    id: "kanton-usk",
    name: "Unsko-sanski kanton",
    url: "https://www.vladausk.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Unsko-sanskog kantona",
    enabled: true,
  },
  {
    id: "kanton-posavski",
    name: "Posavski kanton",
    url: "https://www.pkanton.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Posavskog kantona",
    enabled: true,
  },
  {
    id: "kanton-bpk",
    name: "Bosansko-podrinjski kanton Goražde",
    url: "https://www.bpkg.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi BPK Goražde",
    enabled: true,
  },
  {
    id: "kanton-sbk",
    name: "Srednjobosanski kanton",
    url: "https://www.sbk-ksb.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Srednjobosanskog kantona",
    enabled: true,
  },
  {
    id: "kanton-zhk",
    name: "Zapadnohercegovački kanton",
    url: "https://www.vladazhk.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Zapadnohercegovačkog kantona",
    enabled: true,
  },
  {
    id: "kanton-10",
    name: "Livanjski kanton (Kanton 10)",
    url: "https://www.livanjskikanton.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Livanjskog kantona",
    enabled: true,
  },
  {
    id: "brcko",
    name: "Brčko Distrikt BiH",
    url: "https://www.bdcentral.net/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Brčko Distrikta",
    enabled: true,
  },
  // FBiH sektorska ministarstva
  {
    id: "fzzz",
    name: "Federalni zavod za zapošljavanje",
    url: "https://www.fzzz.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Poticaji za zapošljavanje",
    enabled: true,
  },
  {
    id: "fmpvs",
    name: "Federalno ministarstvo poljoprivrede, vodoprivrede i šumarstva",
    url: "https://fmpvs.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Poticaji za poljoprivredu",
    enabled: true,
  },
  {
    id: "fmoit",
    name: "Federalno ministarstvo okoliša i turizma",
    url: "https://fmoit.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Poticaji za turizam i okoliš",
    enabled: true,
  },
  {
    id: "fmeri",
    name: "Federalno ministarstvo energije, rudarstva i industrije",
    url: "https://www.fmeri.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Poticaji za energiju i industriju",
    enabled: true,
  },
  {
    id: "fmks",
    name: "Federalno ministarstvo kulture i sporta",
    url: "https://www.fmks.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Grantovi za kulturu i sport",
    enabled: true,
  },
  {
    id: "fmrsp",
    name: "Federalno ministarstvo rada i socijalne politike",
    url: "https://www.fmrsp.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Poticaji za zapošljavanje i socijalnu zaštitu",
    enabled: true,
  },
  {
    id: "fipa",
    name: "FIPA - Agencija za unapređenje stranih investicija BiH",
    url: "https://www.fipa.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Investicijski poticaji i grantovi",
    enabled: true,
  },
  {
    id: "mvteo",
    name: "Ministarstvo vanjske trgovine i ekonomskih odnosa BiH",
    url: "https://www.mvteo.gov.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "Grantovi za izvoz i ekonomske odnose",
    enabled: true,
  },
  // Republika Srpska
  {
    id: "vlada-rs",
    name: "Vlada Republike Srpske",
    url: "https://www.vladars.net/",
    category: "opportunities",
    layer: "layer2",
    description: "Javni pozivi Vlade RS",
    enabled: true,
  },
  {
    id: "rars",
    name: "RARS - Razvojna agencija RS",
    url: "https://www.rars-msp.org/",
    category: "opportunities",
    layer: "layer2",
    description: "Poticaji za MSP u Republici Srpskoj",
    enabled: true,
  },
  {
    id: "mper-rs",
    name: "Ministarstvo privrede RS",
    url: "https://mper.vladars.net/",
    category: "opportunities",
    layer: "layer2",
    description: "Poticaji i grantovi Ministarstva privrede RS",
    enabled: true,
  },
  {
    id: "eu-fondovi",
    name: "EU Fondovi BiH",
    url: "https://www.eufondbih.ba/",
    category: "opportunities",
    layer: "layer2",
    description: "EU grantovi i IPA fondovi za BiH",
    enabled: true,
  },

  // Layer 3 - Mjesečno (Gradovi i općine)
  // Veći gradovi - već pokriveni
  {
    id: "grad-sarajevo",
    name: "Grad Sarajevo",
    url: "https://www.sarajevo.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Sarajeva",
    enabled: true,
  },
  {
    id: "grad-tuzla",
    name: "Grad Tuzla",
    url: "https://www.tuzla.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Tuzle",
    enabled: true,
  },
  {
    id: "grad-zenica",
    name: "Grad Zenica",
    url: "https://www.zenica.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Zenice",
    enabled: true,
  },
  {
    id: "grad-mostar",
    name: "Grad Mostar",
    url: "https://www.mostar.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Mostara",
    enabled: true,
  },
  {
    id: "grad-banja-luka",
    name: "Grad Banja Luka",
    url: "https://www.banjaluka.rs.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Banja Luka",
    enabled: true,
  },
  // RS gradovi
  {
    id: "grad-bijeljina",
    name: "Grad Bijeljina",
    url: "https://www.bijeljina.rs.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Bijeljine",
    enabled: true,
  },
  {
    id: "grad-doboj",
    name: "Grad Doboj",
    url: "https://www.opstinadoboj.rs.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Doboja",
    enabled: true,
  },
  {
    id: "grad-prijedor",
    name: "Grad Prijedor",
    url: "https://prijedorgrad.org/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Prijedora",
    enabled: true,
  },
  {
    id: "grad-trebinje",
    name: "Grad Trebinje",
    url: "https://www.trebinje.rs.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Trebinja",
    enabled: true,
  },
  {
    id: "grad-istocno-sarajevo",
    name: "Grad Istočno Sarajevo",
    url: "https://www.istocnosarajevo.rs.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Istočno Sarajevo",
    enabled: true,
  },
  // FBiH gradovi i općine
  {
    id: "grad-bihac",
    name: "Grad Bihać",
    url: "https://www.bihac.org/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Bihaća",
    enabled: true,
  },
  {
    id: "opcina-cazin",
    name: "Općina Cazin",
    url: "https://www.cazin.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Cazin",
    enabled: true,
  },
  {
    id: "grad-gorazde",
    name: "Grad Goražde",
    url: "https://www.gorazde.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Goražde",
    enabled: true,
  },
  {
    id: "opcina-travnik",
    name: "Općina Travnik",
    url: "https://www.travnik.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Travnik",
    enabled: true,
  },
  {
    id: "grad-livno",
    name: "Grad Livno",
    url: "https://www.livno.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Grada Livno",
    enabled: true,
  },
  {
    id: "opcina-tomislavgrad",
    name: "Općina Tomislavgrad",
    url: "https://www.tomislavgrad.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Tomislavgrad",
    enabled: true,
  },
  {
    id: "opcina-visoko",
    name: "Općina Visoko",
    url: "https://www.visoko.gov.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Visoko",
    enabled: true,
  },
  {
    id: "opcina-kakanj",
    name: "Općina Kakanj",
    url: "https://www.kakanj.gov.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Kakanj",
    enabled: true,
  },
  {
    id: "opcina-zavidovici",
    name: "Općina Zavidovići",
    url: "https://www.zavidovici.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Zavidovići",
    enabled: true,
  },
  {
    id: "opcina-tesanj",
    name: "Općina Tešanj",
    url: "https://www.tesanj.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Tešanj",
    enabled: true,
  },
  {
    id: "opcina-gradacac",
    name: "Općina Građačac",
    url: "https://www.gradacac.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Građačac",
    enabled: true,
  },
  {
    id: "opcina-lukavac",
    name: "Općina Lukavac",
    url: "https://www.lukavac.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Lukavac",
    enabled: true,
  },
  {
    id: "opcina-jajce",
    name: "Općina Jajce",
    url: "https://www.jajce.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Jajce",
    enabled: true,
  },
  {
    id: "opcina-konjic",
    name: "Općina Konjic",
    url: "https://www.konjic.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Konjic",
    enabled: true,
  },
  {
    id: "opcina-bugojno",
    name: "Općina Bugojno",
    url: "https://www.bugojno.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Bugojno",
    enabled: true,
  },
  {
    id: "opcina-siroki-brijeg",
    name: "Općina Široki Brijeg",
    url: "https://www.siroki-brijeg.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Široki Brijeg",
    enabled: true,
  },
  {
    id: "opcina-capljina",
    name: "Općina Čapljina",
    url: "https://www.capljina.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Čapljina",
    enabled: true,
  },
  {
    id: "opcina-ljubuski",
    name: "Općina Ljubuški",
    url: "https://www.ljubuski.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Ljubuški",
    enabled: true,
  },
  {
    id: "opcina-stolac",
    name: "Općina Stolac",
    url: "https://www.stolac.gov.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Stolac",
    enabled: true,
  },
  // Sarajevske općine
  {
    id: "opcina-ilidza",
    name: "Općina Ilidža",
    url: "https://www.ilidza.gov.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Ilidža",
    enabled: true,
  },
  {
    id: "novi-grad-sarajevo",
    name: "Novi Grad Sarajevo",
    url: "https://www.novigradsa.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Novi Grad Sarajevo",
    enabled: true,
  },
  {
    id: "opcina-vogosca",
    name: "Općina Vogošća",
    url: "https://www.vogosca.gov.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Vogošća",
    enabled: true,
  },
  {
    id: "opcina-ilijas",
    name: "Općina Ilijaš",
    url: "https://www.ilijas.ba/",
    category: "opportunities",
    layer: "layer3",
    description: "Javni pozivi Općine Ilijaš",
    enabled: true,
  },

  // Legal sources (all layers)
  {
    id: "ajn-news",
    name: "Agencija za javne nabavke BiH - Novosti",
    url: "https://www.javnenabavke.gov.ba/bs/novosti",
    category: "legal",
    layer: "layer1",
    description: "Vijesti o javnim nabavkama",
    enabled: true,
  },
  {
    id: "ajn-laws",
    name: "Agencija za javne nabavke BiH - Zakonodavstvo",
    url: "https://www.javnenabavke.gov.ba/bs/zakonodavstvo",
    category: "legal",
    layer: "layer1",
    description: "Zakoni i pravilnici o javnim nabavkama",
    enabled: true,
  },
  {
    id: "glasnik-fbih",
    name: "Službeni glasnik FBiH",
    url: "http://www.sluzbenenovine.ba",
    category: "legal",
    layer: "layer1",
    description: "Službene novine Federacije BiH",
    enabled: true,
  },
  {
    id: "parlament-bih",
    name: "Parlament BiH",
    url: "https://www.parlament.ba",
    category: "legal",
    layer: "layer2",
    description: "Zakonodavna aktivnost Parlamenta BiH",
    enabled: true,
  },
  {
    id: "vijece-ministara",
    name: "Vijeće ministara BiH",
    url: "https://www.vijeceministara.gov.ba",
    category: "legal",
    layer: "layer2",
    description: "Odluke i uredbe Vijeća ministara",
    enabled: true,
  },
];

/**
 * Dohvati scraper funkciju za određeni izvor
 */
export async function runScraperById(
  sourceId: string
): Promise<ScraperResult[] | LegalScraperResult[]> {
  switch (sourceId) {
    case "fmrpo":
      return [await scrapeFmrpo()];

    case "serda":
    case "redah":
      return await scrapeRazvojneAgencije();

    case "fbih-vlada":
    case "undp-bih":
    case "mcp-bih":
    case "fzzz":
    case "fmpvs":
    case "fmoit":
    case "fmeri":
    case "fmks":
    case "fmrsp":
    case "fipa":
    case "mvteo":
    case "vlada-rs":
    case "rars":
    case "mper-rs":
    case "eu-fondovi":
      return [await scrapeSingleFederalSource(sourceId)];

    case "kanton-sarajevo":
    case "kanton-tuzla":
    case "kanton-zenica":
    case "kanton-hnk":
    case "kanton-usk":
    case "kanton-posavski":
    case "kanton-bpk":
    case "kanton-sbk":
    case "kanton-zhk":
    case "kanton-10":
    case "brcko":
      return [await scrapeSingleCantonalSource(sourceId)];

    case "grad-sarajevo":
    case "grad-tuzla":
    case "grad-zenica":
    case "grad-mostar":
    case "grad-banja-luka":
    case "grad-bijeljina":
    case "grad-doboj":
    case "grad-prijedor":
    case "grad-trebinje":
    case "grad-istocno-sarajevo":
    case "grad-bihac":
    case "opcina-cazin":
    case "grad-gorazde":
    case "opcina-travnik":
    case "grad-livno":
    case "opcina-tomislavgrad":
    case "opcina-visoko":
    case "opcina-kakanj":
    case "opcina-zavidovici":
    case "opcina-tesanj":
    case "opcina-gradacac":
    case "opcina-lukavac":
    case "opcina-jajce":
    case "opcina-konjic":
    case "opcina-bugojno":
    case "opcina-siroki-brijeg":
    case "opcina-capljina":
    case "opcina-ljubuski":
    case "opcina-stolac":
    case "opcina-ilidza":
    case "novi-grad-sarajevo":
    case "opcina-vogosca":
    case "opcina-ilijas":
      return [await scrapeSingleMunicipalSource(sourceId)];

    case "ajn-news":
    case "ajn-laws":
    case "glasnik-fbih":
    case "parlament-bih":
    case "vijece-ministara":
      return [await scrapeSingleLegalSource(sourceId)];

    default:
      throw new Error(`Unknown scraper source: ${sourceId}`);
  }
}

/**
 * Dohvati sve izvore za određeni layer
 */
export function getSourcesByLayer(layer: ExecutionLayer): ScraperSource[] {
  return SCRAPER_SOURCES.filter((s) => s.layer === layer && s.enabled);
}

/**
 * Dohvati sve izvore za određenu kategoriju
 */
export function getSourcesByCategory(category: ScraperCategory): ScraperSource[] {
  return SCRAPER_SOURCES.filter((s) => s.category === category && s.enabled);
}
