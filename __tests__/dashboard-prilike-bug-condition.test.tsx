/**
 * Bug Condition Exploration Test - Dashboard Prilike Server Error Fix
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * This test MUST FAIL on unfixed code to confirm the bug exists.
 * 
 * Bug Condition: Server-side exception when rendering /dashboard/prilike page
 * with null/undefined values in the data fetching pipeline:
 * - opportunity_follows contains null opportunities
 * - company profile is null
 * - opportunity properties are null
 * 
 * EXPECTED OUTCOME: Test FAILS (this proves the bug exists)
 * 
 * After fix, this test will PASS, confirming the expected behavior is satisfied.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import PrilikeDashboardPage from '@/app/(dashboard)/dashboard/prilike/page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock subscription status
vi.mock('@/lib/subscription', () => ({
  getSubscriptionStatus: vi.fn(),
}));

// Mock opportunity recommendations
vi.mock('@/lib/opportunity-recommendations', () => ({
  getPersonalizedOpportunityRecommendations: vi.fn(),
}));

// Mock components
vi.mock('@/components/dashboard/opportunity-dashboard-card', () => ({
  OpportunityDashboardCard: ({ opportunity }: any) => (
    <div data-testid={`opportunity-card-${opportunity.id}`}>{opportunity.title}</div>
  ),
}));

vi.mock('@/components/dashboard/tracked-opportunity-card', () => ({
  TrackedOpportunityCard: ({ follow }: any) => (
    <div data-testid={`tracked-card-${follow.followId}`}>{follow.opportunity.title}</div>
  ),
}));

vi.mock('@/components/subscription/pro-gate', () => ({
  ProGate: () => <div data-testid="pro-gate">Subscribe to access</div>,
}));

describe('Bug Condition Exploration - Dashboard Prilike Server Error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Bug Condition - Null Opportunities in Follows
   * 
   * Test that page renders successfully when opportunity_follows contains
   * null opportunities (e.g., when referenced opportunity was deleted).
   * 
   * This test encodes the EXPECTED behavior (page SHOULD render successfully),
   * so it will FAIL on unfixed code (confirming the bug exists).
   */
  it('Bug Condition 1: Page should render when opportunity_follows contains null opportunities (EXPECTED TO FAIL)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    // Mock authenticated user
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'opportunity_follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'follow-1',
                  outcome: null,
                  created_at: '2024-01-01T00:00:00Z',
                  opportunity_id: 'opp-1',
                  opportunities: null, // NULL OPPORTUNITY - triggers bug
                },
                {
                  id: 'follow-2',
                  outcome: null,
                  created_at: '2024-01-02T00:00:00Z',
                  opportunity_id: 'opp-2',
                  opportunities: {
                    id: 'opp-2',
                    slug: 'valid-opportunity',
                    type: 'poticaj',
                    title: 'Valid Opportunity',
                    issuer: 'Test Issuer',
                    deadline: '2024-12-31',
                    value: 10000,
                    location: 'Sarajevo',
                    ai_summary: 'Test summary',
                    ai_difficulty: 'lako',
                  },
                },
              ],
            }),
          };
        }
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'company-1',
                industry: 'IT',
                keywords: ['software', 'development'],
                cpv_codes: ['48000000'],
                operating_regions: ['Sarajevo'],
              },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getSubscriptionStatus).mockResolvedValue({ isSubscribed: true } as any);
    vi.mocked(getPersonalizedOpportunityRecommendations).mockResolvedValue({
      context: {} as any,
      personalized: [],
      others: [],
    });

    // Attempt to render the page
    // On unfixed code, this will throw an error when trying to access properties on null opportunity
    let renderError: Error | null = null;
    try {
      await render(await PrilikeDashboardPage());
    } catch (error) {
      renderError = error as Error;
    }

    // Expected behavior: Page should render successfully without throwing
    expect(renderError).toBeNull(); // WILL FAIL on unfixed code

    // Document counterexample
    if (renderError) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 1: Null opportunity in follows causes server error');
      console.log('- Error type:', renderError.name);
      console.log('- Error message:', renderError.message);
      console.log('- ISSUE: Page throws exception when opportunity_follows contains null opportunities');
      console.log('- Root cause: Likely accessing properties on null opportunity without null check');
      console.log('============================\n');
    }
  });

  /**
   * Property 2: Bug Condition - Undefined Opportunities in Follows
   * 
   * Test that page renders successfully when opportunity_follows contains
   * undefined opportunities (different from null, but similar issue).
   */
  it('Bug Condition 2: Page should render when opportunity_follows contains undefined opportunities (EXPECTED TO FAIL)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'opportunity_follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'follow-1',
                  outcome: null,
                  created_at: '2024-01-01T00:00:00Z',
                  opportunity_id: 'opp-1',
                  opportunities: undefined, // UNDEFINED OPPORTUNITY - triggers bug
                },
              ],
            }),
          };
        }
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'company-1',
                industry: 'IT',
                keywords: ['software'],
                cpv_codes: [],
                operating_regions: [],
              },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getSubscriptionStatus).mockResolvedValue({ isSubscribed: true } as any);
    vi.mocked(getPersonalizedOpportunityRecommendations).mockResolvedValue({
      context: {} as any,
      personalized: [],
      others: [],
    });

    let renderError: Error | null = null;
    try {
      await render(await PrilikeDashboardPage());
    } catch (error) {
      renderError = error as Error;
    }

    expect(renderError).toBeNull(); // WILL FAIL on unfixed code

    if (renderError) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 2: Undefined opportunity in follows causes server error');
      console.log('- Error:', renderError.message);
      console.log('- ISSUE: Filter may not handle undefined correctly (only checks !== null)');
      console.log('============================\n');
    }
  });

  /**
   * Property 3: Bug Condition - Null Company Profile
   * 
   * Test that page renders successfully when user has no company profile
   * (company query returns null).
   */
  it('Bug Condition 3: Page should render when company profile is null (EXPECTED TO FAIL)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'opportunity_follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'follow-1',
                  outcome: null,
                  created_at: '2024-01-01T00:00:00Z',
                  opportunity_id: 'opp-1',
                  opportunities: {
                    id: 'opp-1',
                    slug: 'test-opportunity',
                    type: 'poticaj',
                    title: 'Test Opportunity',
                    issuer: 'Test Issuer',
                    deadline: '2024-12-31',
                    value: 5000,
                    location: 'Banja Luka',
                    ai_summary: 'Summary',
                    ai_difficulty: 'srednje',
                  },
                },
              ],
            }),
          };
        }
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null, // NULL COMPANY - triggers bug
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getSubscriptionStatus).mockResolvedValue({ isSubscribed: true } as any);
    vi.mocked(getPersonalizedOpportunityRecommendations).mockResolvedValue({
      context: {} as any,
      personalized: [],
      others: [],
    });

    let renderError: Error | null = null;
    try {
      await render(await PrilikeDashboardPage());
    } catch (error) {
      renderError = error as Error;
    }

    expect(renderError).toBeNull(); // WILL FAIL on unfixed code

    if (renderError) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 3: Null company profile causes server error');
      console.log('- Error:', renderError.message);
      console.log('- ISSUE: Recommendation context builder may access company properties unsafely');
      console.log('============================\n');
    }
  });

  /**
   * Property 4: Bug Condition - Null Opportunity Properties
   * 
   * Test that page renders successfully when opportunities have null
   * optional properties (deadline, location, value, etc.).
   */
  it('Bug Condition 4: Page should render when opportunity properties are null (EXPECTED TO FAIL)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'opportunity_follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'follow-1',
                  outcome: null,
                  created_at: '2024-01-01T00:00:00Z',
                  opportunity_id: 'opp-1',
                  opportunities: {
                    id: 'opp-1',
                    slug: 'minimal-opportunity',
                    type: 'poticaj',
                    title: 'Minimal Opportunity',
                    issuer: 'Test Issuer',
                    deadline: null, // NULL DEADLINE
                    value: null, // NULL VALUE
                    location: null, // NULL LOCATION
                    ai_summary: null, // NULL SUMMARY
                    ai_difficulty: null, // NULL DIFFICULTY
                  },
                },
              ],
            }),
          };
        }
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'company-1',
                industry: 'Construction',
                keywords: [],
                cpv_codes: [],
                operating_regions: [],
              },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getSubscriptionStatus).mockResolvedValue({ isSubscribed: true } as any);
    vi.mocked(getPersonalizedOpportunityRecommendations).mockResolvedValue({
      context: {} as any,
      personalized: [],
      others: [],
    });

    let renderError: Error | null = null;
    try {
      await render(await PrilikeDashboardPage());
    } catch (error) {
      renderError = error as Error;
    }

    expect(renderError).toBeNull(); // WILL FAIL on unfixed code

    if (renderError) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 4: Null opportunity properties cause server error');
      console.log('- Error:', renderError.message);
      console.log('- ISSUE: Code may access null properties without safe defaults');
      console.log('============================\n');
    }
  });

  /**
   * Property 5: Property-Based Test - Mixed Valid/Invalid Follows
   * 
   * Generate various combinations of valid and null opportunities in follows
   * and verify that page always renders successfully, filtering out null ones.
   */
  it('Property: Page should render for any mix of valid/null opportunities (EXPECTED TO FAIL)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nullCount: fc.integer({ min: 0, max: 5 }),
          validCount: fc.integer({ min: 0, max: 5 }),
        }),
        async (scenario) => {
          const { createClient } = await import('@/lib/supabase/server');
          const { getSubscriptionStatus } = await import('@/lib/subscription');
          const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

          // Generate mixed follows data
          const followsData = [
            ...Array.from({ length: scenario.nullCount }, (_, i) => ({
              id: `follow-null-${i}`,
              outcome: null,
              created_at: '2024-01-01T00:00:00Z',
              opportunity_id: `opp-null-${i}`,
              opportunities: null,
            })),
            ...Array.from({ length: scenario.validCount }, (_, i) => ({
              id: `follow-valid-${i}`,
              outcome: null,
              created_at: '2024-01-02T00:00:00Z',
              opportunity_id: `opp-valid-${i}`,
              opportunities: {
                id: `opp-valid-${i}`,
                slug: `opportunity-${i}`,
                type: 'poticaj' as const,
                title: `Opportunity ${i}`,
                issuer: 'Test Issuer',
                deadline: '2024-12-31',
                value: 10000,
                location: 'Sarajevo',
                ai_summary: 'Summary',
                ai_difficulty: 'lako' as const,
              },
            })),
          ];

          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'test-user-123', email: 'test@example.com' } },
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'opportunity_follows') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({ data: followsData }),
                };
              }
              if (table === 'companies') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'company-1',
                      industry: 'IT',
                      keywords: ['test'],
                      cpv_codes: [],
                      operating_regions: [],
                    },
                  }),
                };
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [] }),
              };
            }),
          };

          vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
          vi.mocked(getSubscriptionStatus).mockResolvedValue({ isSubscribed: true } as any);
          vi.mocked(getPersonalizedOpportunityRecommendations).mockResolvedValue({
            context: {} as any,
            personalized: [],
            others: [],
          });

          let renderError: Error | null = null;
          try {
            await render(await PrilikeDashboardPage());
          } catch (error) {
            renderError = error as Error;
          }

          // Property: For ANY combination of null/valid opportunities, page should render
          expect(renderError).toBeNull(); // WILL FAIL on unfixed code

          if (renderError) {
            console.log('\n=== PROPERTY VIOLATION ===');
            console.log('Scenario:', scenario);
            console.log('Null opportunities:', scenario.nullCount);
            console.log('Valid opportunities:', scenario.validCount);
            console.log('Error:', renderError.message);
            console.log('=========================\n');
          }
        }
      ),
      { numRuns: 10 } // Run 10 different scenarios
    );
  });

  /**
   * Property 6: Property-Based Test - Company Data Variations
   * 
   * Generate various company data states (null, partial, complete) and verify
   * that page always renders successfully with safe defaults.
   */
  it('Property: Page should render for any company data state (EXPECTED TO FAIL)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasCompany: fc.boolean(),
          hasIndustry: fc.boolean(),
          hasKeywords: fc.boolean(),
          hasCpvCodes: fc.boolean(),
          hasRegions: fc.boolean(),
        }),
        async (scenario) => {
          const { createClient } = await import('@/lib/supabase/server');
          const { getSubscriptionStatus } = await import('@/lib/subscription');
          const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

          const companyData = scenario.hasCompany
            ? {
                id: 'company-1',
                industry: scenario.hasIndustry ? 'IT' : null,
                keywords: scenario.hasKeywords ? ['software'] : [],
                cpv_codes: scenario.hasCpvCodes ? ['48000000'] : [],
                operating_regions: scenario.hasRegions ? ['Sarajevo'] : [],
              }
            : null;

          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'test-user-123', email: 'test@example.com' } },
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'opportunity_follows') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({ data: [] }),
                };
              }
              if (table === 'companies') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({ data: companyData }),
                };
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [] }),
              };
            }),
          };

          vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
          vi.mocked(getSubscriptionStatus).mockResolvedValue({ isSubscribed: true } as any);
          vi.mocked(getPersonalizedOpportunityRecommendations).mockResolvedValue({
            context: {} as any,
            personalized: [],
            others: [],
          });

          let renderError: Error | null = null;
          try {
            await render(await PrilikeDashboardPage());
          } catch (error) {
            renderError = error as Error;
          }

          // Property: For ANY company data state, page should render with safe defaults
          expect(renderError).toBeNull(); // WILL FAIL on unfixed code

          if (renderError) {
            console.log('\n=== PROPERTY VIOLATION ===');
            console.log('Scenario:', scenario);
            console.log('Company data:', companyData);
            console.log('Error:', renderError.message);
            console.log('=========================\n');
          }
        }
      ),
      { numRuns: 10 } // Run 10 different scenarios
    );
  });
});

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✗ Bug Condition 1: Page should render when opportunity_follows contains null opportunities (EXPECTED TO FAIL)
 *   - Counterexample: TypeError when accessing properties on null opportunity
 *   - Issue: Filter doesn't properly remove null opportunities, or code accesses properties without null check
 * 
 * ✗ Bug Condition 2: Page should render when opportunity_follows contains undefined opportunities (EXPECTED TO FAIL)
 *   - Counterexample: Filter using !== null doesn't catch undefined values
 *   - Issue: Need to use != null (loose equality) to catch both null and undefined
 * 
 * ✗ Bug Condition 3: Page should render when company profile is null (EXPECTED TO FAIL)
 *   - Counterexample: Error in recommendation context builder when accessing company properties
 *   - Issue: buildOpportunityRecommendationContext or downstream functions don't handle null company safely
 * 
 * ✗ Bug Condition 4: Page should render when opportunity properties are null (EXPECTED TO FAIL)
 *   - Counterexample: Error when rendering cards with null properties
 *   - Issue: Components may not handle null deadline, location, value, etc.
 * 
 * ✗ Property: Page should render for any mix of valid/null opportunities (EXPECTED TO FAIL)
 *   - Multiple counterexamples across different null/valid ratios
 * 
 * ✗ Property: Page should render for any company data state (EXPECTED TO FAIL)
 *   - Multiple counterexamples across different company data completeness levels
 * 
 * These failures CONFIRM the bug exists and provide concrete counterexamples.
 */
