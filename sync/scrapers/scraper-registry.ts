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

  // Layer 2 - Sedmično (Cantonal + Sector ministries)
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

  // Layer 3 - Mjesečno (Municipal sources)
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
      return [await scrapeSingleFederalSource(sourceId)];

    case "kanton-sarajevo":
    case "kanton-tuzla":
    case "kanton-zenica":
      return [await scrapeSingleCantonalSource(sourceId)];

    case "grad-sarajevo":
    case "grad-tuzla":
    case "grad-zenica":
    case "grad-mostar":
    case "grad-banja-luka":
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
