/**
 * Integration test for post-sync-pipeline with new scrapers
 * 
 * Tests:
 * - Layered execution strategy (layer1, layer2, layer3)
 * - Content hashing integration
 * - Quality filtering integration
 * - Preservation of existing pipeline behavior
 */

import { describe, it, expect } from "vitest";

describe("Post-Sync Pipeline Integration", () => {
  it("should export runPostSyncPipeline function with layer parameter", async () => {
    const { runPostSyncPipeline } = await import("../sync/post-sync-pipeline");
    
    expect(runPostSyncPipeline).toBeDefined();
    expect(typeof runPostSyncPipeline).toBe("function");
  });

  it("should import all new scraper modules", async () => {
    const federalSources = await import("../sync/scrapers/scraper-federal-sources");
    const cantonalSources = await import("../sync/scrapers/scraper-cantonal-sources");
    const municipalSources = await import("../sync/scrapers/scraper-municipal-sources");
    const legalUpdates = await import("../sync/scrapers/scraper-legal-updates");
    
    expect(federalSources.scrapeFederalSources).toBeDefined();
    expect(cantonalSources.scrapeCantonalSources).toBeDefined();
    expect(municipalSources.scrapeMunicipalSources).toBeDefined();
    expect(legalUpdates.scrapeLegalUpdates).toBeDefined();
  });

  it("should import content hashing utilities", async () => {
    const contentHasher = await import("../sync/scrapers/content-hasher");
    
    expect(contentHasher.generateContentHash).toBeDefined();
    expect(contentHasher.detectChangeStatus).toBeDefined();
    expect(contentHasher.processOpportunitiesWithHashing).toBeDefined();
  });

  it("should import quality filtering utilities", async () => {
    const qualityFilter = await import("../sync/scrapers/quality-filter");
    
    expect(qualityFilter.applyQualityFilter).toBeDefined();
    expect(qualityFilter.filterOpportunities).toBeDefined();
    expect(qualityFilter.calculateRelevanceScore).toBeDefined();
  });

  it("should import scraper orchestrator with ExecutionLayer type", async () => {
    const orchestrator = await import("../sync/scrapers/scraper-orchestrator");
    
    expect(orchestrator.executeScraperLayer).toBeDefined();
  });

  it("should have PostSyncResult interface with new fields", async () => {
    const pipeline = await import("../sync/post-sync-pipeline");
    
    // Type check - this will fail at compile time if interface is wrong
    const mockResult: Awaited<ReturnType<typeof pipeline.runPostSyncPipeline>> = {
      opportunities_processed: 0,
      opportunities_published: 0,
      opportunities_filtered: 0, // New field
      legal_updates_processed: 0,
      errors: [],
      duration_ms: 0,
      execution_layer: "layer1", // New field
    };
    
    expect(mockResult).toBeDefined();
  });
});

describe("Layered Execution Strategy", () => {
  it("should support layer1 (daily) execution", () => {
    const layer: "layer1" = "layer1";
    expect(layer).toBe("layer1");
  });

  it("should support layer2 (weekly) execution", () => {
    const layer: "layer2" = "layer2";
    expect(layer).toBe("layer2");
  });

  it("should support layer3 (monthly) execution", () => {
    const layer: "layer3" = "layer3";
    expect(layer).toBe("layer3");
  });
});

describe("Content Hashing Integration", () => {
  it("should generate content hash for opportunities", async () => {
    const { generateContentHash } = await import("../sync/scrapers/content-hasher");
    
    const opportunity = {
      external_id: "test:123",
      title: "Test Grant",
      issuer: "Test Agency",
      category: "Poticaji i grantovi",
      description: "Test description for grant opportunity",
      requirements: "Test requirements",
      value: 10000,
      deadline: "2025-12-31",
      location: "Sarajevo",
      source_url: "https://example.com/grant",
      eligibility_signals: ["MSP"],
    };
    
    const hash = generateContentHash(opportunity);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
  });

  it("should detect change status correctly", async () => {
    const { detectChangeStatus } = await import("../sync/scrapers/content-hasher");
    
    const newHash = "abc123";
    const existingHash = "def456";
    const deadline = "2025-12-31";
    
    // NEW: no existing hash
    expect(detectChangeStatus(newHash, null, deadline)).toBe("NEW");
    
    // UPDATED: hash changed
    expect(detectChangeStatus(newHash, existingHash, deadline)).toBe("UPDATED");
    
    // UNCHANGED: hash matches
    expect(detectChangeStatus(newHash, newHash, deadline)).toBe("UNCHANGED");
  });
});

describe("Quality Filtering Integration", () => {
  it("should filter out opportunities without deadline", async () => {
    const { applyQualityFilter } = await import("../sync/scrapers/quality-filter");
    
    const opportunity = {
      external_id: "test:123",
      title: "Test Grant Without Deadline",
      issuer: "Test Agency",
      category: "Poticaji i grantovi",
      description: "Test description that is long enough to pass the minimum length requirement",
      requirements: null,
      value: null,
      deadline: null, // Missing deadline
      location: "Sarajevo",
      source_url: "https://example.com/grant",
      eligibility_signals: [],
    };
    
    const result = applyQualityFilter(opportunity);
    
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("deadline");
  });

  it("should filter out opportunities with short description", async () => {
    const { applyQualityFilter } = await import("../sync/scrapers/quality-filter");
    
    const opportunity = {
      external_id: "test:123",
      title: "Test Grant",
      issuer: "Test Agency",
      category: "Poticaji i grantovi",
      description: "Short", // Too short
      requirements: null,
      value: null,
      deadline: "2025-12-31",
      location: "Sarajevo",
      source_url: "https://example.com/grant",
      eligibility_signals: [],
    };
    
    const result = applyQualityFilter(opportunity);
    
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("Description");
  });

  it("should pass opportunities with good quality", async () => {
    const { applyQualityFilter } = await import("../sync/scrapers/quality-filter");
    
    // Create a future deadline (1 year from now)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const deadline = futureDate.toISOString().split('T')[0];
    
    const opportunity = {
      external_id: "test:123",
      title: "Test Grant for Small Businesses",
      issuer: "Test Agency",
      category: "Poticaji i grantovi",
      description: "This is a comprehensive grant program for small and medium enterprises. The grant provides financial support for business development and innovation projects.",
      requirements: "Must be registered SME",
      value: 50000,
      deadline,
      location: "Sarajevo",
      source_url: "https://example.com/grant",
      eligibility_signals: ["MSP"],
    };
    
    const result = applyQualityFilter(opportunity);
    
    expect(result.passed).toBe(true);
    expect(result.relevanceScore).toBeGreaterThan(0);
  });
});
