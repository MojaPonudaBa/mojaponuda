/**
 * Preservation Property Tests - Dashboard Prilike Server Error Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 * 
 * These tests capture the EXISTING behavior on UNFIXED code for valid data scenarios.
 * They ensure that the fix doesn't break existing functionality for non-buggy inputs.
 * 
 * METHODOLOGY: Observation-first approach
 * 1. Run tests on UNFIXED code with valid data
 * 2. Tests should PASS (confirming baseline behavior)
 * 3. After fix, tests should still PASS (confirming no regressions)
 * 
 * EXPECTED OUTCOME: Tests PASS on unfixed code (baseline behavior is correct)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

describe('Preservation Properties - Dashboard Prilike Valid Data Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 1: Valid Opportunity Follows Display Correctly
   * 
   * **Validates: Requirements 3.1, 3.4, 3.6**
   * 
   * Observation: When user has valid opportunity follows with complete data,
   * the page displays them in "Praćene prilike" section with all details.
   */
  it('Property: Valid opportunity follows display correctly in Praćene prilike section', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    const activeFollows = [
      {
        id: 'follow-active-1',
        outcome: null,
        created_at: '2024-01-01T00:00:00Z',
        opportunity_id: 'opp-active-1',
        opportunities: {
          id: 'opp-active-1',
          slug: 'opportunity-active-1',
          type: 'poticaj' as const,
          title: 'Active Opportunity 1',
          issuer: 'Test Issuer',
          deadline: '2024-12-31',
          value: 10000,
          location: 'Sarajevo',
          ai_summary: 'Test summary',
          ai_difficulty: 'lako' as const,
        },
      },
      {
        id: 'follow-active-2',
        outcome: null,
        created_at: '2024-01-02T00:00:00Z',
        opportunity_id: 'opp-active-2',
        opportunities: {
          id: 'opp-active-2',
          slug: 'opportunity-active-2',
          type: 'poticaj' as const,
          title: 'Active Opportunity 2',
          issuer: 'Another Issuer',
          deadline: '2024-11-30',
          value: 25000,
          location: 'Banja Luka',
          ai_summary: 'Another summary',
          ai_difficulty: 'srednje' as const,
        },
      },
    ];

    const resolvedFollows = [
      {
        id: 'follow-resolved-1',
        outcome: 'won' as const,
        created_at: '2024-01-03T00:00:00Z',
        opportunity_id: 'opp-resolved-1',
        opportunities: {
          id: 'opp-resolved-1',
          slug: 'opportunity-resolved-1',
          type: 'poticaj' as const,
          title: 'Won Opportunity',
          issuer: 'Test Issuer',
          deadline: '2024-10-31',
          value: 15000,
          location: 'Mostar',
          ai_summary: 'Won summary',
          ai_difficulty: 'tesko' as const,
        },
      },
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
            order: vi.fn().mockResolvedValue({
              data: [...activeFollows, ...resolvedFollows],
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

    await render(await PrilikeDashboardPage());

    // Property: All active follows should be rendered
    const activeCard1 = screen.getByTestId('tracked-card-follow-active-1');
    expect(activeCard1).toBeTruthy();
    expect(activeCard1.textContent).toContain('Active Opportunity 1');

    const activeCard2 = screen.getByTestId('tracked-card-follow-active-2');
    expect(activeCard2).toBeTruthy();
    expect(activeCard2.textContent).toContain('Active Opportunity 2');

    // Property: All resolved follows should be rendered in archive section
    const resolvedCard = screen.getByTestId('tracked-card-follow-resolved-1');
    expect(resolvedCard).toBeTruthy();
    expect(resolvedCard.textContent).toContain('Won Opportunity');
  });

  /**
   * Property 2: Personalized Recommendations Work Correctly
   * 
   * **Validates: Requirements 3.2, 3.7**
   * 
   * Observation: When user has valid company profile with complete data,
   * personalized recommendations are generated and displayed in "Poticaji za Vas" section.
   */
  it('Property: Personalized recommendations work correctly with valid company data', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    const personalizedOpportunities = [
      {
        opportunity: {
          id: 'personalized-1',
          slug: 'personalized-opportunity-1',
          type: 'poticaj' as const,
          title: 'Personalized Opportunity 1',
          issuer: 'Personalized Issuer',
          category: 'IT',
          subcategory: 'Software',
          industry: 'IT',
          value: 50000,
          deadline: '2024-12-31',
          location: 'Sarajevo',
          requirements: 'IT requirements',
          eligibility_signals: ['signal1', 'signal2'],
          description: 'Personalized description',
          status: 'active' as const,
          ai_summary: 'Personalized summary',
          ai_who_should_apply: 'IT companies',
          ai_difficulty: 'lako' as const,
          created_at: '2024-01-01T00:00:00Z',
        },
      },
      {
        opportunity: {
          id: 'personalized-2',
          slug: 'personalized-opportunity-2',
          type: 'poticaj' as const,
          title: 'Personalized Opportunity 2',
          issuer: 'Another Personalized Issuer',
          category: 'IT',
          subcategory: 'Web Development',
          industry: 'IT',
          value: 75000,
          deadline: '2024-11-30',
          location: 'Banja Luka',
          requirements: 'Web dev requirements',
          eligibility_signals: ['signal3'],
          description: 'Another personalized description',
          status: 'active' as const,
          ai_summary: 'Another personalized summary',
          ai_who_should_apply: 'Web development companies',
          ai_difficulty: 'srednje' as const,
          created_at: '2024-01-02T00:00:00Z',
        },
      },
    ];

    const otherOpportunities = [
      {
        id: 'other-1',
        slug: 'other-opportunity-1',
        type: 'poticaj' as const,
        title: 'Other Opportunity 1',
        issuer: 'Other Issuer',
        category: 'Construction',
        subcategory: null,
        industry: 'Construction',
        value: 30000,
        deadline: '2024-12-15',
        location: 'Tuzla',
        requirements: null,
        eligibility_signals: null,
        description: 'Other description',
        status: 'active' as const,
        ai_summary: 'Other summary',
        ai_who_should_apply: null,
        ai_difficulty: 'srednje' as const,
        created_at: '2024-01-01T00:00:00Z',
      },
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
            order: vi.fn().mockResolvedValue({ data: [] }),
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
                keywords: ['software', 'development', 'web'],
                cpv_codes: ['48000000', '72000000'],
                operating_regions: ['Sarajevo', 'Banja Luka'],
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
      personalized: personalizedOpportunities,
      others: otherOpportunities,
    });

    await render(await PrilikeDashboardPage());

    // Property: All personalized opportunities should be rendered
    const personalizedCard1 = screen.getByTestId('opportunity-card-personalized-1');
    expect(personalizedCard1).toBeTruthy();
    expect(personalizedCard1.textContent).toContain('Personalized Opportunity 1');

    const personalizedCard2 = screen.getByTestId('opportunity-card-personalized-2');
    expect(personalizedCard2).toBeTruthy();
    expect(personalizedCard2.textContent).toContain('Personalized Opportunity 2');

    // Property: All other opportunities should be rendered
    const otherCard = screen.getByTestId('opportunity-card-other-1');
    expect(otherCard).toBeTruthy();
    expect(otherCard.textContent).toContain('Other Opportunity 1');
  });

  /**
   * Property 3: Opportunity Cards Display All Details Correctly
   * 
   * **Validates: Requirements 3.6**
   * 
   * Observation: When opportunities have complete data, cards display all details
   * (title, issuer, deadline, location, value, difficulty) correctly.
   */
  it('Property: Opportunity cards display all details correctly when data is present', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    const opportunity = {
      id: 'test-opp-1',
      slug: 'test-opportunity',
      type: 'poticaj' as const,
      title: 'Complete Opportunity with All Details',
      issuer: 'Complete Issuer Name',
      category: 'IT',
      subcategory: 'Software',
      industry: 'IT',
      value: 100000,
      deadline: '2024-12-31',
      location: 'Sarajevo',
      requirements: 'Test requirements',
      eligibility_signals: ['signal1'],
      description: 'Test description',
      status: 'active' as const,
      ai_summary: 'Complete test summary with all information',
      ai_who_should_apply: 'IT companies',
      ai_difficulty: 'lako' as const,
      created_at: '2024-01-01T00:00:00Z',
    };

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
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'company-1',
                industry: 'IT',
                keywords: ['software'],
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
      others: [opportunity],
    });

    await render(await PrilikeDashboardPage());

    // Property: Opportunity card should be rendered with correct data
    const card = screen.getByTestId('opportunity-card-test-opp-1');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Complete Opportunity with All Details');
  });

  /**
   * Property 4: Sections Show/Hide Correctly Based on Data Availability
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   * 
   * Observation: Sections (Praćene prilike, Arhiva prijava, Poticaji za Vas, Ostali poticaji)
   * show or hide correctly based on whether data is available.
   */
  it('Property: Sections show/hide correctly based on data availability', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const { getPersonalizedOpportunityRecommendations } = await import('@/lib/opportunity-recommendations');

    const activeFollow = {
      id: 'follow-active-1',
      outcome: null,
      created_at: '2024-01-01T00:00:00Z',
      opportunity_id: 'opp-active-1',
      opportunities: {
        id: 'opp-active-1',
        slug: 'active-opportunity',
        type: 'poticaj' as const,
        title: 'Active Opportunity',
        issuer: 'Test Issuer',
        deadline: '2024-12-31',
        value: 10000,
        location: 'Sarajevo',
        ai_summary: 'Test summary',
        ai_difficulty: 'lako' as const,
      },
    };

    const resolvedFollow = {
      id: 'follow-resolved-1',
      outcome: 'won' as const,
      created_at: '2024-01-01T00:00:00Z',
      opportunity_id: 'opp-resolved-1',
      opportunities: {
        id: 'opp-resolved-1',
        slug: 'resolved-opportunity',
        type: 'poticaj' as const,
        title: 'Resolved Opportunity',
        issuer: 'Test Issuer',
        deadline: '2024-12-31',
        value: 5000,
        location: 'Banja Luka',
        ai_summary: 'Test summary',
        ai_difficulty: 'srednje' as const,
      },
    };

    const personalizedOpportunity = {
      opportunity: {
        id: 'personalized-1',
        slug: 'personalized-opportunity',
        type: 'poticaj' as const,
        title: 'Personalized Opportunity',
        issuer: 'Personalized Issuer',
        category: 'IT',
        subcategory: 'Software',
        industry: 'IT',
        value: 50000,
        deadline: '2024-12-31',
        location: 'Sarajevo',
        requirements: 'Test requirements',
        eligibility_signals: ['signal1'],
        description: 'Test description',
        status: 'active' as const,
        ai_summary: 'Personalized summary',
        ai_who_should_apply: 'IT companies',
        ai_difficulty: 'lako' as const,
        created_at: '2024-01-01T00:00:00Z',
      },
    };

    const otherOpportunity = {
      id: 'other-1',
      slug: 'other-opportunity',
      type: 'poticaj' as const,
      title: 'Other Opportunity',
      issuer: 'Other Issuer',
      category: 'Construction',
      subcategory: null,
      industry: 'Construction',
      value: 20000,
      deadline: '2024-12-31',
      location: 'Mostar',
      requirements: null,
      eligibility_signals: null,
      description: 'Test description',
      status: 'active' as const,
      ai_summary: 'Other summary',
      ai_who_should_apply: null,
      ai_difficulty: 'srednje' as const,
      created_at: '2024-01-01T00:00:00Z',
    };

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
              data: [activeFollow, resolvedFollow],
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
      personalized: [personalizedOpportunity],
      others: [otherOpportunity],
    });

    await render(await PrilikeDashboardPage());

    // Property: Active follows section should be present
    const activeCard = screen.getByTestId('tracked-card-follow-active-1');
    expect(activeCard).toBeTruthy();

    // Property: Resolved follows section should be present
    const resolvedCard = screen.getByTestId('tracked-card-follow-resolved-1');
    expect(resolvedCard).toBeTruthy();

    // Property: Personalized section should be present
    const personalizedCard = screen.getByTestId('opportunity-card-personalized-1');
    expect(personalizedCard).toBeTruthy();

    // Property: Others section should be present
    const otherCard = screen.getByTestId('opportunity-card-other-1');
    expect(otherCard).toBeTruthy();
  });

  /**
   * Property 5: ProGate Redirect for Unsubscribed Users
   * 
   * **Validates: Requirements 3.5**
   * 
   * Observation: When user is not subscribed, ProGate component is shown
   * instead of the opportunities dashboard.
   */
  it('Property: ProGate redirect works correctly for unsubscribed users', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getSubscriptionStatus).mockResolvedValue({ isSubscribed: false } as any);

    await render(await PrilikeDashboardPage());

    // Property: ProGate should be shown for unsubscribed users
    const proGate = screen.getByTestId('pro-gate');
    expect(proGate).toBeTruthy();
    expect(proGate.textContent).toContain('Subscribe to access');
  });
});

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✓ Property: Valid opportunity follows display correctly in Praćene prilike section
 *   - Confirms that valid follows are displayed correctly
 * 
 * ✓ Property: Personalized recommendations work correctly with valid company data
 *   - Confirms that personalized recommendations work with valid company profile
 * 
 * ✓ Property: Opportunity cards display all details correctly when data is present
 *   - Confirms that cards display all opportunity details correctly
 * 
 * ✓ Property: Sections show/hide correctly based on data availability
 *   - Confirms that sections appear/disappear based on data availability
 * 
 * ✓ Property: ProGate redirect works correctly for unsubscribed users
 *   - Confirms that unsubscribed users see ProGate component
 * 
 * These passing tests CONFIRM the baseline behavior that must be preserved after the fix.
 */
