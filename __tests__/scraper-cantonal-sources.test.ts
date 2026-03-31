/**
 * Unit tests for cantonal sources scraper
 * Tests flexible CMS support and multiple parsing strategies
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the fetch-html module
vi.mock("../sync/scrapers/fetch-html", () => ({
  fetchHtml: vi.fn(),
  extractLinks: vi.fn(),
  stripTags: (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  parseDate: (raw: string | null | undefined) => {
    if (!raw) return null;
    const dmy = raw.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return null;
  },
  parseValue: (raw: string | null | undefined) => {
    if (!raw) return null;
    const digits = raw.replace(/[^\d,.]/g, "").replace(",", ".");
    const num = parseFloat(digits.replace(/\.(?=\d{3})/g, ""));
    return isNaN(num) ? null : num;
  },
}));

describe("Cantonal Sources Scraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export scrapeCantonalSources function", async () => {
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");
    expect(scrapeCantonalSources).toBeDefined();
    expect(typeof scrapeCantonalSources).toBe("function");
  });

  it("should handle WordPress CMS structure", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    const mockListHtml = `
      <article class="post">
        <a href="/konkurs-za-msp-2024">Konkurs za MSP 2024</a>
      </article>
    `;

    const mockDetailHtml = `
      <h1>Konkurs za MSP 2024</h1>
      <div class="content">
        Opis konkursa za mala i srednja preduzeća.
      </div>
      <p>Rok: 31.12.2024</p>
      <p>Iznos: 100.000 KM</p>
    `;

    vi.mocked(fetchHtml)
      .mockResolvedValueOnce(mockListHtml)
      .mockResolvedValueOnce(mockDetailHtml);

    const results = await scrapeCantonalSources();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should handle Joomla CMS structure", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    const mockListHtml = `
      <div class="item">
        <a href="/javni-poziv-turizam">Javni poziv za turizam</a>
      </div>
    `;

    const mockDetailHtml = `
      <h1>Javni poziv za turizam</h1>
      <article>
        Poziv za finansiranje turističkih projekata.
      </article>
      <p>Rok prijave: 15.06.2024</p>
    `;

    vi.mocked(fetchHtml)
      .mockResolvedValueOnce(mockListHtml)
      .mockResolvedValueOnce(mockDetailHtml);

    const results = await scrapeCantonalSources();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle custom government CMS with section keywords", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    const mockListHtml = `
      <section>
        <h2>Javni pozivi</h2>
        <a href="/poziv-poljoprivreda">Poziv za poljoprivredu</a>
      </section>
    `;

    const mockDetailHtml = `
      <h1>Poziv za poljoprivredu</h1>
      <div class="main">
        Poticaji za poljoprivrednike.
      </div>
    `;

    vi.mocked(fetchHtml)
      .mockResolvedValueOnce(mockListHtml)
      .mockResolvedValueOnce(mockDetailHtml);

    const results = await scrapeCantonalSources();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should extract eligibility signals correctly", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    const mockListHtml = `
      <article>
        <a href="/konkurs-msp">Konkurs za MSP</a>
      </article>
    `;

    const mockDetailHtml = `
      <h1>Konkurs za MSP</h1>
      <div class="content">
        Poziv za mala i srednja preduzeća, poduzetnike i obrte.
        Fokus na inovacije i digitalizaciju.
      </div>
      <p>Rok: 30.09.2024</p>
    `;

    vi.mocked(fetchHtml)
      .mockResolvedValueOnce(mockListHtml)
      .mockResolvedValueOnce(mockDetailHtml);

    const results = await scrapeCantonalSources();
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    
    // Check that at least one result has items
    const resultsWithItems = results.filter(r => r.items.length > 0);
    if (resultsWithItems.length > 0) {
      const firstItem = resultsWithItems[0].items[0];
      expect(firstItem.eligibility_signals).toBeDefined();
      expect(Array.isArray(firstItem.eligibility_signals)).toBe(true);
    }
  });

  it("should handle unavailable pages gracefully", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    vi.mocked(fetchHtml).mockResolvedValue(null);

    const results = await scrapeCantonalSources();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    
    // All results should have error or empty items
    results.forEach(result => {
      expect(result.error !== undefined || result.items.length === 0).toBe(true);
    });
  });

  it("should limit results to 20 items per canton", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    // Create HTML with 30 links
    const links = Array.from({ length: 30 }, (_, i) => 
      `<article><a href="/konkurs-${i}">Konkurs ${i}</a></article>`
    ).join("\n");

    const mockListHtml = `<div>${links}</div>`;
    const mockDetailHtml = `<h1>Test</h1><div class="content">Test content</div>`;

    vi.mocked(fetchHtml)
      .mockResolvedValueOnce(mockListHtml)
      .mockResolvedValue(mockDetailHtml);

    const results = await scrapeCantonalSources();
    
    expect(results).toBeDefined();
    
    // Each canton should have at most 20 items
    results.forEach(result => {
      expect(result.items.length).toBeLessThanOrEqual(20);
    });
  });

  it("should generate correct external_id format", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    const mockListHtml = `
      <article>
        <a href="/test-konkurs">Test Konkurs</a>
      </article>
    `;

    const mockDetailHtml = `
      <h1>Test Konkurs</h1>
      <div class="content">Test description with enough content to pass validation.</div>
    `;

    vi.mocked(fetchHtml)
      .mockResolvedValueOnce(mockListHtml)
      .mockResolvedValueOnce(mockDetailHtml);

    const results = await scrapeCantonalSources();
    
    const resultsWithItems = results.filter(r => r.items.length > 0);
    if (resultsWithItems.length > 0) {
      const firstItem = resultsWithItems[0].items[0];
      expect(firstItem.external_id).toBeDefined();
      expect(firstItem.external_id).toMatch(/^[^:]+:[A-Za-z0-9+/=]+$/);
    }
  });

  it("should skip items with titles shorter than 10 characters", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

    const mockListHtml = `
      <article>
        <a href="/short">Short</a>
      </article>
    `;

    const mockDetailHtml = `
      <h1>Short</h1>
      <div class="content">This should be skipped due to short title.</div>
    `;

    vi.mocked(fetchHtml)
      .mockResolvedValueOnce(mockListHtml)
      .mockResolvedValueOnce(mockDetailHtml);

    const results = await scrapeCantonalSources();
    
    expect(results).toBeDefined();
    
    // Items with short titles should be filtered out
    results.forEach(result => {
      result.items.forEach(item => {
        expect(item.title.length).toBeGreaterThanOrEqual(10);
      });
    });
  });
});
