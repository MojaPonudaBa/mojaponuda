import { describe, it, expect } from "vitest";
import { calculateUrgency } from "@/components/opportunities/urgency-banner";
import { generateCTAConfig } from "@/components/opportunities/enhanced-cta";

describe("Opportunity Quality System", () => {
  describe("Urgency Banner", () => {
    it("should return null for opportunities without deadline", () => {
      const urgency = calculateUrgency(null);
      expect(urgency).toBeNull();
    });

    it("should return critical urgency for deadline today", () => {
      const today = new Date();
      const urgency = calculateUrgency(today.toISOString());
      expect(urgency).not.toBeNull();
      expect(urgency?.urgency_level).toBe("critical");
      expect(urgency?.message).toContain("DANAS");
    });

    it("should return high urgency for deadline in 3 days", () => {
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);
      const urgency = calculateUrgency(threeDays.toISOString());
      expect(urgency).not.toBeNull();
      expect(urgency?.urgency_level).toBe("high");
      expect(urgency?.message).toContain("3 DANA");
    });

    it("should return medium urgency for deadline in 7 days", () => {
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      const urgency = calculateUrgency(sevenDays.toISOString());
      expect(urgency).not.toBeNull();
      expect(urgency?.urgency_level).toBe("medium");
    });

    it("should return null for deadline more than 7 days away", () => {
      const tenDays = new Date();
      tenDays.setDate(tenDays.getDate() + 10);
      const urgency = calculateUrgency(tenDays.toISOString());
      expect(urgency).toBeNull();
    });

    it("should return expired for past deadline", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const urgency = calculateUrgency(yesterday.toISOString());
      expect(urgency).not.toBeNull();
      expect(urgency?.urgency_level).toBe("expired");
      expect(urgency?.message).toContain("ISTEKAO");
    });
  });

  describe("Enhanced CTA", () => {
    const mockOpportunity = {
      id: "test-id",
      slug: "test-slug",
      title: "Test Opportunity",
      category: "test-category",
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      ai_difficulty: "srednje" as const,
      status: "active",
    };

    it("should generate signup CTA for non-logged-in users with deadline", () => {
      const config = generateCTAConfig(mockOpportunity, false);
      expect(config.primary_action).toBe("signup");
      expect(config.primary_text).toContain("Automatski prati");
      expect(config.signup_context).toBeDefined();
    });

    it("should generate follow CTA for logged-in users", () => {
      const config = generateCTAConfig(mockOpportunity, true);
      expect(config.primary_action).toBe("follow");
      expect(config.primary_text).toContain("Prati");
    });

    it("should include checklist for difficult opportunities", () => {
      const difficultOpp = { ...mockOpportunity, ai_difficulty: "tesko" as const };
      const config = generateCTAConfig(difficultOpp, false);
      expect(config.secondary_text).toContain("checklistu");
    });

    it("should generate view_similar CTA for expired opportunities", () => {
      const expiredOpp = { ...mockOpportunity, status: "expired" };
      const config = generateCTAConfig(expiredOpp, false);
      expect(config.primary_action).toBe("view_similar");
    });
  });


});
