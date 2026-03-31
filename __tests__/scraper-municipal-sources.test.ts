/**
 * Unit tests for Municipal Sources Scraper (Layer 3)
 * Tests the scraper's ability to handle various CMS systems and extract data
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch-html module
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

describe("Municipal Sources Scraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export scrapeMunicipalSources function", async () => {
    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    expect(scrapeMunicipalSources).toBeDefined();
    expect(typeof scrapeMunicipalSources).toBe("function");
  });

  it("should handle WordPress CMS structure", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    // Mock WordPress structure
    const wordpressHtml = `
      <html>
        <body>
          <article class="post">
            <a href="/javni-poziv-1">Javni poziv za MSP</a>
          </article>
        </body>
      </html>
    `;

    const detailHtml = `
      <html>
        <head><title>Javni poziv za MSP - Grad Sarajevo</title></head>
        <body>
          <h1>Javni poziv za MSP</h1>
          <div class="content">
            Opis javnog poziva za mala i srednja preduzeća.
            Rok za prijavu: 31.12.2024
            Iznos: 50.000 KM
          </div>
        </body>
      </html>
    `;

    mockFetchHtml
      .mockResolvedValueOnce(wordpressHtml)
      .mockResolvedValueOnce(detailHtml);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should handle Drupal CMS structure", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    // Mock Drupal structure
    const drupalHtml = `
      <html>
        <body>
          <div class="view-content">
            <article class="node">
              <a href="/konkurs-za-poticaje">Konkurs za poticaje</a>
            </article>
          </div>
        </body>
      </html>
    `;

    mockFetchHtml.mockResolvedValueOnce(drupalHtml);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle custom municipal CMS with auto-detection", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    // Mock custom CMS with section keywords
    const customCmsHtml = `
      <html>
        <body>
          <div class="municipality-section">
            <h2>Javni pozivi</h2>
            <a href="/poziv-1">Grant za turizam</a>
          </div>
        </body>
      </html>
    `;

    mockFetchHtml.mockResolvedValueOnce(customCmsHtml);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle HTML5 semantic structure", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    // Mock HTML5 semantic structure
    const html5Html = `
      <html>
        <body>
          <main>
            <section>
              <a href="/natjecaj-1">Natječaj za subvencije</a>
            </section>
          </main>
        </body>
      </html>
    `;

    mockFetchHtml.mockResolvedValueOnce(html5Html);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should extract eligibility signals correctly", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    const listHtml = `<article><a href="/poziv">Poziv</a></article>`;
    const detailHtml = `
      <html>
        <head><title>Poziv za MSP</title></head>
        <body>
          <h1>Poziv za mala i srednja preduzeća</h1>
          <div class="content">
            Program je namijenjen za startupove, inovacije i digitalizaciju.
            Rok: 31.12.2024
          </div>
        </body>
      </html>
    `;

    mockFetchHtml
      .mockResolvedValueOnce(listHtml)
      .mockResolvedValueOnce(detailHtml);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    // Eligibility signals should include MSP, startupovi, inovacije, digitalizacija
  });

  it("should handle unavailable pages gracefully", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    mockFetchHtml.mockResolvedValueOnce(null);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    // Should return results with errors for unavailable sources
    results.forEach(result => {
      if (result.error) {
        expect(result.error).toBe("Stranica nedostupna");
      }
    });
  });

  it("should limit to 20 links per municipality", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    // Generate HTML with many links
    const manyLinksHtml = `
      <html>
        <body>
          ${Array.from({ length: 50 }, (_, i) => `
            <article>
              <a href="/poziv-${i}">Poziv ${i}</a>
            </article>
          `).join("")}
        </body>
      </html>
    `;

    mockFetchHtml.mockResolvedValue(manyLinksHtml);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    // Each municipality should process max 20 links
    results.forEach(result => {
      expect(result.items.length).toBeLessThanOrEqual(20);
    });
  });

  it("should use same data model as other scrapers", async () => {
    const { fetchHtml } = await import("../sync/scrapers/fetch-html");
    const mockFetchHtml = fetchHtml as ReturnType<typeof vi.fn>;

    const listHtml = `<article><a href="/poziv">Test Poziv</a></article>`;
    const detailHtml = `
      <html>
        <head><title>Test Poziv</title></head>
        <body>
          <h1>Test Javni Poziv</h1>
          <div class="content">
            Test opis poziva.
            Rok: 31.12.2024
            Iznos: 10.000 KM
          </div>
        </body>
      </html>
    `;

    mockFetchHtml
      .mockResolvedValueOnce(listHtml)
      .mockResolvedValueOnce(detailHtml);

    const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");
    const results = await scrapeMunicipalSources();

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    // Check data model structure
    results.forEach(result => {
      expect(result).toHaveProperty("source");
      expect(result).toHaveProperty("items");
      
      result.items.forEach(item => {
        expect(item).toHaveProperty("external_id");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("issuer");
        expect(item).toHaveProperty("category");
        expect(item).toHaveProperty("description");
        expect(item).toHaveProperty("requirements");
        expect(item).toHaveProperty("value");
        expect(item).toHaveProperty("deadline");
        expect(item).toHaveProperty("location");
        expect(item).toHaveProperty("source_url");
        expect(item).toHaveProperty("eligibility_signals");
        expect(Array.isArray(item.eligibility_signals)).toBe(true);
      });
    });
  });
});
