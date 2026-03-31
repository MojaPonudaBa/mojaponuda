/**
 * Unit tests for quality filter system
 */

import { describe, it, expect } from "vitest";
import {
  applyQualityFilter,
  calculateRelevanceScore,
  filterOpportunities,
} from "../sync/scrapers/quality-filter";
import type { ScrapedOpportunity } from "../sync/scrapers/types";

describe("Quality Filter System", () => {
  const createMockOpportunity = (overrides?: Partial<ScrapedOpportunity>): ScrapedOpportunity => ({
    external_id: "test:123",
    title: "Test Grant Opportunity",
    issuer: "Test Agency",
    category: "Poticaji i grantovi",
    description: "This is a test description that is long enough to pass the minimum length requirement.",
    requirements: "Test requirements",
    value: 10000,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    location: "Test Location",
    source_url: "https://example.com/test",
    eligibility_signals: [],
    ...overrides,
  });

  describe("applyQualityFilter", () => {
    it("should pass a valid opportunity", () => {
      const item = createMockOpportunity();
      const result = applyQualityFilter(item);
      
      expect(result.passed).toBe(true);
      expect(result.relevanceScore).toBeGreaterThan(0);
    });

    it("should reject opportunity with short title", () => {
      const item = createMockOpportunity({ title: "Short" });
      const result = applyQualityFilter(item);
      
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Title too short");
    });

    it("should reject opportunity with short description", () => {
      const item = createMockOpportunity({ description: "Too short" });
      const result = applyQualityFilter(item);
      
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Description too short");
    });

    it("should reject opportunity without deadline", () => {
      const item = createMockOpportunity({ deadline: null });
      const result = applyQualityFilter(item);
      
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("No deadline");
    });

    it("should reject opportunity with expired deadline", () => {
      const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
      const item = createMockOpportunity({ deadline: expiredDate });
      const result = applyQualityFilter(item);
      
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("should reject opportunity with low relevance", () => {
      const item = createMockOpportunity({
        title: "Information about office hours",
        description: "This is information about our office hours and contact details for the public.",
        category: "Information",
        value: null, // Remove value boost
        requirements: null, // Remove requirements boost
      });
      const result = applyQualityFilter(item);
      
      // Even though it passes basic quality checks, it should fail on relevance
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Not relevant");
      expect(result.relevanceScore).toBeLessThan(0.3);
    });
  });

  describe("calculateRelevanceScore", () => {
    it("should give high score for grant-related content", () => {
      const item = createMockOpportunity({
        title: "Javni poziv za dodjelu grant sredstava",
        description: "Poticaj za mala i srednja preduzeća. Subvencija za razvoj biznisa.",
      });
      const score = calculateRelevanceScore(item);
      
      expect(score).toBeGreaterThan(0.5);
    });

    it("should give low score for non-grant content", () => {
      const item = createMockOpportunity({
        title: "Information about office hours",
        description: "This is information about our office hours and contact details.",
        category: "Information",
        value: null, // Remove value boost
        requirements: null, // Remove requirements boost
      });
      const score = calculateRelevanceScore(item);
      
      // Score should be low (only deadline boost of 0.1)
      expect(score).toBeLessThanOrEqual(0.15);
    });

    it("should boost score for employment grants", () => {
      const item = createMockOpportunity({
        title: "Poticaj za zapošljavanje mladih",
        description: "Grant program za subvenciju zapošljavanja.",
      });
      const score = calculateRelevanceScore(item);
      
      expect(score).toBeGreaterThan(0.5);
    });

    it("should boost score for grant announcements", () => {
      const item = createMockOpportunity({
        title: "Obavijest o pozivu za dodjelu grant sredstava",
        description: "Obavještenje o konkursu za poticaje.",
      });
      const score = calculateRelevanceScore(item);
      
      expect(score).toBeGreaterThan(0.5);
    });

    it("should boost score for items with value", () => {
      const itemWithValue = createMockOpportunity({
        title: "Grant program",
        value: 50000,
      });
      const itemWithoutValue = createMockOpportunity({
        title: "Grant program",
        value: null,
      });
      
      const scoreWithValue = calculateRelevanceScore(itemWithValue);
      const scoreWithoutValue = calculateRelevanceScore(itemWithoutValue);
      
      expect(scoreWithValue).toBeGreaterThan(scoreWithoutValue);
    });
  });

  describe("filterOpportunities", () => {
    it("should filter array of opportunities", () => {
      const items = [
        createMockOpportunity({ title: "Valid Grant Opportunity 1" }),
        createMockOpportunity({ title: "Short" }), // Should fail
        createMockOpportunity({ title: "Valid Grant Opportunity 2" }),
        createMockOpportunity({ deadline: null }), // Should fail
      ];

      const result = filterOpportunities(items);

      expect(result.stats.total).toBe(4);
      expect(result.stats.passed).toBe(2);
      expect(result.stats.failed).toBe(2);
      expect(result.filtered).toHaveLength(2);
    });

    it("should track failure reasons", () => {
      const items = [
        createMockOpportunity({ title: "Short" }),
        createMockOpportunity({ title: "Also" }),
        createMockOpportunity({ deadline: null }),
      ];

      const result = filterOpportunities(items);

      expect(result.stats.reasons["Title too short or missing (< 10 chars)"]).toBe(2);
      expect(result.stats.reasons["No deadline specified"]).toBe(1);
    });

    it("should return empty array when all items fail", () => {
      const items = [
        createMockOpportunity({ title: "Short" }),
        createMockOpportunity({ deadline: null }),
      ];

      const result = filterOpportunities(items);

      expect(result.filtered).toHaveLength(0);
      expect(result.stats.passed).toBe(0);
      expect(result.stats.failed).toBe(2);
    });

    it("should return all items when all pass", () => {
      const items = [
        createMockOpportunity({ title: "Valid Grant Opportunity 1" }),
        createMockOpportunity({ title: "Valid Grant Opportunity 2" }),
        createMockOpportunity({ title: "Valid Grant Opportunity 3" }),
      ];

      const result = filterOpportunities(items);

      expect(result.filtered).toHaveLength(3);
      expect(result.stats.passed).toBe(3);
      expect(result.stats.failed).toBe(0);
    });
  });
});
