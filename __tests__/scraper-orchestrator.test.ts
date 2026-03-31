/**
 * Unit tests for Scraper Orchestrator
 * 
 * Tests layered execution strategy, error handling, rate limiting,
 * and fallback mechanisms.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeScraperLayer,
  executeWithRetry,
  executeWithFallback,
  checkRobotsTxt,
  type ExecutionLayer,
} from "../sync/scrapers/scraper-orchestrator";
import type { ScraperResult } from "../sync/scrapers/types";

// Mock the scraper modules
vi.mock("../sync/scrapers/scraper-fbih-ministarstvo", () => ({
  scrapeFmrpo: vi.fn(),
}));

vi.mock("../sync/scrapers/scraper-federal-sources", () => ({
  scrapeFederalSources: vi.fn(),
}));

vi.mock("../sync/scrapers/scraper-cantonal-sources", () => ({
  scrapeCantonalSources: vi.fn(),
}));

vi.mock("../sync/scrapers/scraper-municipal-sources", () => ({
  scrapeMunicipalSources: vi.fn(),
}));

describe("Scraper Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeScraperLayer", () => {
    it("should execute Layer 1 scrapers (daily)", async () => {
      const { scrapeFmrpo } = await import("../sync/scrapers/scraper-fbih-ministarstvo");
      const { scrapeFederalSources } = await import("../sync/scrapers/scraper-federal-sources");

      vi.mocked(scrapeFmrpo).mockResolvedValue({
        source: "javnipozivi.fmrpo.gov.ba",
        items: [
          {
            external_id: "fmrpo:test1",
            title: "Test Grant 1",
            issuer: "FMRPO",
            category: "Poticaji i grantovi",
            description: "Test description",
            requirements: null,
            value: 10000,
            deadline: "2024-12-31",
            location: "Federacija BiH",
            source_url: "https://javnipozivi.fmrpo.gov.ba/test1",
            eligibility_signals: ["MSP"],
          },
        ],
      });

      vi.mocked(scrapeFederalSources).mockResolvedValue([
        {
          source: "fbihvlada.gov.ba",
          items: [
            {
              external_id: "fbih:test1",
              title: "FBiH Grant",
              issuer: "Vlada FBiH",
              category: "Poticaji i grantovi",
              description: "Test",
              requirements: null,
              value: 5000,
              deadline: "2024-12-31",
              location: "Federacija BiH",
              source_url: "https://fbihvlada.gov.ba/test1",
              eligibility_signals: [],
            },
          ],
        },
        {
          source: "javnipoziv.undp.ba",
          items: [],
        },
        {
          source: "mcp.gov.ba",
          items: [],
        },
      ]);

      const result = await executeScraperLayer({
        layer: "layer1",
        respectRateLimit: false,
      });

      expect(result.layer).toBe("layer1");
      expect(result.totalItems).toBeGreaterThan(0);
      expect(scrapeFmrpo).toHaveBeenCalled();
      expect(scrapeFederalSources).toHaveBeenCalled();
    });

    it("should execute Layer 2 scrapers (weekly)", async () => {
      const { scrapeFederalSources } = await import("../sync/scrapers/scraper-federal-sources");
      const { scrapeCantonalSources } = await import("../sync/scrapers/scraper-cantonal-sources");

      vi.mocked(scrapeFederalSources).mockResolvedValue([
        {
          source: "mcp.gov.ba",
          items: [],
        },
        {
          source: "fzzz.ba",
          items: [],
        },
      ]);

      vi.mocked(scrapeCantonalSources).mockResolvedValue([
        {
          source: "mp.ks.gov.ba",
          items: [],
        },
      ]);

      const result = await executeScraperLayer({
        layer: "layer2",
        respectRateLimit: false,
      });

      expect(result.layer).toBe("layer2");
      expect(scrapeFederalSources).toHaveBeenCalled();
      expect(scrapeCantonalSources).toHaveBeenCalled();
    });

    it("should execute Layer 3 scrapers (monthly)", async () => {
      const { scrapeMunicipalSources } = await import("../sync/scrapers/scraper-municipal-sources");

      vi.mocked(scrapeMunicipalSources).mockResolvedValue([
        {
          source: "sarajevo.ba",
          items: [],
        },
      ]);

      const result = await executeScraperLayer({
        layer: "layer3",
        respectRateLimit: false,
      });

      expect(result.layer).toBe("layer3");
      expect(scrapeMunicipalSources).toHaveBeenCalled();
    });

    it("should handle scraper errors gracefully", async () => {
      const { scrapeFmrpo } = await import("../sync/scrapers/scraper-fbih-ministarstvo");
      const { scrapeFederalSources } = await import("../sync/scrapers/scraper-federal-sources");

      vi.mocked(scrapeFmrpo).mockRejectedValue(new Error("Network error"));
      vi.mocked(scrapeFederalSources).mockResolvedValue([
        {
          source: "fbihvlada.gov.ba",
          items: [],
        },
      ]);

      const result = await executeScraperLayer({
        layer: "layer1",
        respectRateLimit: false,
      });

      // Should not crash, should continue with other scrapers
      expect(result.totalErrors).toBeGreaterThan(0);
      expect(result.results.some((r) => r.error)).toBe(true);
    });
  });

  describe("executeWithRetry", () => {
    it("should succeed on first attempt", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const result = await executeWithRetry(mockFn, 3, 100);

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue("success");

      const result = await executeWithRetry(mockFn, 3, 10);

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should throw after max retries", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("Always fails"));

      await expect(executeWithRetry(mockFn, 3, 10)).rejects.toThrow("Always fails");
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("executeWithFallback", () => {
    it("should use primary parser when successful", async () => {
      const primaryResult: ScraperResult = {
        source: "test.gov.ba",
        items: [
          {
            external_id: "test:1",
            title: "Test",
            issuer: "Test",
            category: "Test",
            description: "Test",
            requirements: null,
            value: null,
            deadline: null,
            location: null,
            source_url: "https://test.gov.ba",
            eligibility_signals: [],
          },
        ],
      };

      const primaryFn = vi.fn().mockResolvedValue(primaryResult);
      const alternativeFn = vi.fn();

      const result = await executeWithFallback(primaryFn, alternativeFn);

      expect(result).toEqual(primaryResult);
      expect(primaryFn).toHaveBeenCalled();
      expect(alternativeFn).not.toHaveBeenCalled();
    });

    it("should use alternative parser when primary returns no items", async () => {
      const primaryResult: ScraperResult = {
        source: "test.gov.ba",
        items: [],
      };

      const alternativeResult: ScraperResult = {
        source: "test.gov.ba",
        items: [
          {
            external_id: "test:1",
            title: "Test",
            issuer: "Test",
            category: "Test",
            description: "Test",
            requirements: null,
            value: null,
            deadline: null,
            location: null,
            source_url: "https://test.gov.ba",
            eligibility_signals: [],
          },
        ],
      };

      const primaryFn = vi.fn().mockResolvedValue(primaryResult);
      const alternativeFn = vi.fn().mockResolvedValue(alternativeResult);

      const result = await executeWithFallback(primaryFn, alternativeFn);

      expect(result).toEqual(alternativeResult);
      expect(primaryFn).toHaveBeenCalled();
      expect(alternativeFn).toHaveBeenCalled();
    });

    it("should use alternative parser when primary fails", async () => {
      const alternativeResult: ScraperResult = {
        source: "test.gov.ba",
        items: [
          {
            external_id: "test:1",
            title: "Test",
            issuer: "Test",
            category: "Test",
            description: "Test",
            requirements: null,
            value: null,
            deadline: null,
            location: null,
            source_url: "https://test.gov.ba",
            eligibility_signals: [],
          },
        ],
      };

      const primaryFn = vi.fn().mockRejectedValue(new Error("Primary failed"));
      const alternativeFn = vi.fn().mockResolvedValue(alternativeResult);

      const result = await executeWithFallback(primaryFn, alternativeFn);

      expect(result).toEqual(alternativeResult);
      expect(primaryFn).toHaveBeenCalled();
      expect(alternativeFn).toHaveBeenCalled();
    });

    it("should use headless browser when both primary and alternative fail", async () => {
      const headlessResult: ScraperResult = {
        source: "test.gov.ba",
        items: [
          {
            external_id: "test:1",
            title: "Test",
            issuer: "Test",
            category: "Test",
            description: "Test",
            requirements: null,
            value: null,
            deadline: null,
            location: null,
            source_url: "https://test.gov.ba",
            eligibility_signals: [],
          },
        ],
      };

      const primaryFn = vi.fn().mockRejectedValue(new Error("Primary failed"));
      const alternativeFn = vi.fn().mockRejectedValue(new Error("Alternative failed"));
      const headlessFn = vi.fn().mockResolvedValue(headlessResult);

      const result = await executeWithFallback(primaryFn, alternativeFn, headlessFn);

      expect(result).toEqual(headlessResult);
      expect(primaryFn).toHaveBeenCalled();
      expect(alternativeFn).toHaveBeenCalled();
      expect(headlessFn).toHaveBeenCalled();
    });

    it("should return error result when all strategies fail", async () => {
      const primaryFn = vi.fn().mockRejectedValue(new Error("Primary failed"));
      const alternativeFn = vi.fn().mockRejectedValue(new Error("Alternative failed"));
      const headlessFn = vi.fn().mockRejectedValue(new Error("Headless failed"));

      const result = await executeWithFallback(primaryFn, alternativeFn, headlessFn);

      expect(result.items).toEqual([]);
      expect(result.error).toContain("All parsing strategies failed");
    });
  });

  describe("checkRobotsTxt", () => {
    it("should allow scraping when robots.txt allows", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "User-agent: *\nAllow: /",
      });

      const allowed = await checkRobotsTxt("https://test.gov.ba");

      expect(allowed).toBe(true);
    });

    it("should disallow scraping when robots.txt disallows", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "User-agent: *\nDisallow: /",
      });

      const allowed = await checkRobotsTxt("https://test.gov.ba");

      expect(allowed).toBe(false);
    });

    it("should allow scraping when robots.txt does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const allowed = await checkRobotsTxt("https://test.gov.ba");

      expect(allowed).toBe(true);
    });

    it("should allow scraping on fetch error (fail open)", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const allowed = await checkRobotsTxt("https://test.gov.ba");

      expect(allowed).toBe(true);
    });
  });
});
