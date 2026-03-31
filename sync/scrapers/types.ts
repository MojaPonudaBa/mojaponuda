export interface ScrapedOpportunity {
  external_id: string;
  title: string;
  issuer: string;
  category: string;
  description: string | null;
  requirements: string | null;
  value: number | null;
  deadline: string | null; // ISO date
  location: string | null;
  source_url: string;
  eligibility_signals: string[];
}

export interface ScraperResult {
  source: string;
  items: ScrapedOpportunity[];
  error?: string;
}
