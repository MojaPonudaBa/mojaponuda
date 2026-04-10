/**
 * Preservation Property Tests - Agency Client Bids Server Error Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 * 
 * These tests capture the EXISTING behavior on UNFIXED code for valid bids with complete tender data.
 * They ensure that the fix doesn't break existing functionality.
 * 
 * IMPORTANT: These tests should PASS on UNFIXED code (confirming baseline behavior).
 * After implementing the fix, these tests should STILL PASS (confirming no regressions).
 * 
 * Testing Approach:
 * - Observe behavior on UNFIXED code for valid bids with complete tender data
 * - Write property-based tests capturing observed behavior patterns
 * - Run tests on UNFIXED code
 * - EXPECTED OUTCOME: Tests PASS (this confirms baseline behavior to preserve)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import AgencyClientBidsPage from '@/app/(dashboard)/dashboard/agency/clients/[id]/bids/page';
import type { BidStatus } from '@/types/database';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock subscription status
vi.mock('@/lib/subscription', () => ({
  getSubscriptionStatus: vi.fn(),
}));

// Mock components
vi.mock('@/components/bids/bids-table', () => ({
  BidsTable: ({ bids, getBidHref }: any) => (
    <div data-testid="bids-table">
      {bids.map((bid: any) => (
        <div key={bid.id} data-testid={`bid-${bid.id}`}>
          <span data-testid={`bid-${bid.id}-status`}>{bid.status}</span>
          <span data-testid={`bid-${bid.id}-title`}>
            {bid.tender?.title ?? 'Tender nije dostupan'}
          </span>
          <span data-testid={`bid-${bid.id}-authority`}>
            {bid.tender?.contracting_authority ?? 'Nepoznat naručilac'}
          </span>
          <span data-testid={`bid-${bid.id}-deadline`}>
            {bid.tender?.deadline ? new Date(bid.tender.deadline).toLocaleDateString('bs-BA') : 'Rok nije objavljen'}
          </span>
          {getBidHref && (
            <a href={getBidHref(bid)} data-testid={`bid-${bid.id}-link`}>
              Otvori ponudu
            </a>
          )}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/bids/new-bid-modal', () => ({
  NewBidModal: ({ tenders, agencyClientId, bidPathBase }: any) => (
    <div data-testid="new-bid-modal">
      <span data-testid="modal-client-id">{agencyClientId}</span>
      <span data-testid="modal-path-base">{bidPathBase}</span>
      <div data-testid="modal-tenders-count">{tenders.length}</div>
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('Preservation Properties - Agency Client Bids Valid Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 1: Valid Bids Display Correctly
   * 
   * **Validates: Requirement 3.1**
   * 
   * For any valid bids with complete tender data, the system should display them correctly
   * in the bids table with all tender information visible.
   */
  it('Property 1: Valid bids with complete tender data display correctly', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'agency-user-123', email: 'agency@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'agency_clients') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'client-1',
                company_id: 'company-1',
                companies: {
                  id: 'company-1',
                  name: 'Test Company',
                },
              },
            }),
          };
        }
        if (table === 'bids') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'bid-1',
                  status: 'draft',
                  created_at: '2024-01-01T00:00:00Z',
                  tenders: {
                    id: 'tender-1',
                    title: 'Valid Tender 1',
                    contracting_authority: 'Authority 1',
                    deadline: '2024-12-31',
                  },
                },
                {
                  id: 'bid-2',
                  status: 'submitted',
                  created_at: '2024-01-02T00:00:00Z',
                  tenders: {
                    id: 'tender-2',
                    title: 'Valid Tender 2',
                    contracting_authority: 'Authority 2',
                    deadline: '2024-11-30',
                  },
                },
              ],
            }),
          };
        }
        if (table === 'tenders') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'tender-1',
                  title: 'Available Tender',
                  contracting_authority: 'Authority 1',
                },
              ],
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
    vi.mocked(getSubscriptionStatus).mockResolvedValue({
      plan: { id: 'agency' },
    } as any);

    const result = await AgencyClientBidsPage({ params: Promise.resolve({ id: 'client-1' }) });
    render(result);

    // Verify bids table is rendered
    expect(screen.getByTestId('bids-table')).toBeDefined();

    // Verify both bids are displayed
    expect(screen.getByTestId('bid-bid-1')).toBeDefined();
    expect(screen.getByTestId('bid-bid-2')).toBeDefined();

    // Verify tender titles are displayed correctly
    expect(screen.getByTestId('bid-bid-1-title').textContent).toBe('Valid Tender 1');
    expect(screen.getByTestId('bid-bid-2-title').textContent).toBe('Valid Tender 2');

    // Verify contracting authorities are displayed correctly
    expect(screen.getByTestId('bid-bid-1-authority').textContent).toBe('Authority 1');
    expect(screen.getByTestId('bid-bid-2-authority').textContent).toBe('Authority 2');

    // Verify deadlines are displayed correctly (formatted)
    expect(screen.getByTestId('bid-bid-1-deadline').textContent).toContain('2024');
    expect(screen.getByTestId('bid-bid-2-deadline').textContent).toContain('2024');
  });

  /**
   * Property 2: Tender Details Display Correctly
   * 
   * **Validates: Requirement 3.4**
   * 
   * For any valid tender with complete data (title, contracting_authority, deadline),
   * the system should display all fields correctly without fallback text.
   */
  it('Property 2: Tender details (title, authority, deadline) display correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 100 }),
          authority: fc.string({ minLength: 5, maxLength: 50 }),
          deadline: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        }),
        async (tenderData) => {
          const { createClient } = await import('@/lib/supabase/server');
          const { getSubscriptionStatus } = await import('@/lib/subscription');

          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'agency-user-123', email: 'agency@example.com' } },
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'agency_clients') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'client-1',
                      company_id: 'company-1',
                      companies: {
                        id: 'company-1',
                        name: 'Test Company',
                      },
                    },
                  }),
                };
              }
              if (table === 'bids') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'bid-1',
                        status: 'draft',
                        created_at: '2024-01-01T00:00:00Z',
                        tenders: {
                          id: 'tender-1',
                          title: tenderData.title,
                          contracting_authority: tenderData.authority,
                          deadline: tenderData.deadline.toISOString(),
                        },
                      },
                    ],
                  }),
                };
              }
              if (table === 'tenders') {
                return {
                  select: vi.fn().mockReturnThis(),
                  order: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({ data: [] }),
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
          vi.mocked(getSubscriptionStatus).mockResolvedValue({
            plan: { id: 'agency' },
          } as any);

          const result = await AgencyClientBidsPage({ params: Promise.resolve({ id: 'client-1' }) });
          const { container } = render(result);
          
          // Property: For ANY valid tender data, display should show actual values (not fallbacks)
          const titleElement = container.querySelector('[data-testid="bid-bid-1-title"]');
          const authorityElement = container.querySelector('[data-testid="bid-bid-1-authority"]');
          const deadlineElement = container.querySelector('[data-testid="bid-bid-1-deadline"]');

          expect(titleElement?.textContent).toBe(tenderData.title);
          expect(authorityElement?.textContent).toBe(tenderData.authority);
          expect(deadlineElement?.textContent).not.toBe('Rok nije objavljen');
          expect(deadlineElement?.textContent).toContain(tenderData.deadline.getFullYear().toString());
          
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 3: Bid Status Display Correctly
   * 
   * **Validates: Requirement 3.3**
   * 
   * For any valid bid status, the system should display the correct status badge.
   */
  it('Property 3: Bid status badges display correctly for all statuses', async () => {
    const validStatuses: BidStatus[] = ['draft', 'in_review', 'submitted', 'won', 'lost'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...validStatuses),
        async (status) => {
          const { createClient } = await import('@/lib/supabase/server');
          const { getSubscriptionStatus } = await import('@/lib/subscription');

          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'agency-user-123', email: 'agency@example.com' } },
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'agency_clients') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'client-1',
                      company_id: 'company-1',
                      companies: {
                        id: 'company-1',
                        name: 'Test Company',
                      },
                    },
                  }),
                };
              }
              if (table === 'bids') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'bid-1',
                        status: status,
                        created_at: '2024-01-01T00:00:00Z',
                        tenders: {
                          id: 'tender-1',
                          title: 'Test Tender',
                          contracting_authority: 'Test Authority',
                          deadline: '2024-12-31',
                        },
                      },
                    ],
                  }),
                };
              }
              if (table === 'tenders') {
                return {
                  select: vi.fn().mockReturnThis(),
                  order: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({ data: [] }),
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
          vi.mocked(getSubscriptionStatus).mockResolvedValue({
            plan: { id: 'agency' },
          } as any);

          const result = await AgencyClientBidsPage({ params: Promise.resolve({ id: 'client-1' }) });
          const { container } = render(result);

          // Property: For ANY valid status, the status should be displayed correctly
          const statusElement = container.querySelector('[data-testid="bid-bid-1-status"]');
          expect(statusElement?.textContent).toBe(status);
          
          cleanup();
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 4: NewBidModal Displays Available Tenders
   * 
   * **Validates: Requirement 3.2**
   * 
   * The NewBidModal should receive the list of available tenders from the tenders query
   * and display them correctly.
   */
  it('Property 4: NewBidModal displays available tenders correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 5, maxLength: 100 }),
            contracting_authority: fc.string({ minLength: 5, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (tenders) => {
          const { createClient } = await import('@/lib/supabase/server');
          const { getSubscriptionStatus } = await import('@/lib/subscription');

          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'agency-user-123', email: 'agency@example.com' } },
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'agency_clients') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'client-1',
                      company_id: 'company-1',
                      companies: {
                        id: 'company-1',
                        name: 'Test Company',
                      },
                    },
                  }),
                };
              }
              if (table === 'bids') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({ data: [] }),
                };
              }
              if (table === 'tenders') {
                return {
                  select: vi.fn().mockReturnThis(),
                  order: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({ data: tenders }),
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
          vi.mocked(getSubscriptionStatus).mockResolvedValue({
            plan: { id: 'agency' },
          } as any);

          const result = await AgencyClientBidsPage({ params: Promise.resolve({ id: 'client-1' }) });
          const { container } = render(result);

          // Property: For ANY list of available tenders, NewBidModal should receive them
          const modalElement = container.querySelector('[data-testid="new-bid-modal"]');
          expect(modalElement).toBeDefined();

          const tendersCountElement = container.querySelector('[data-testid="modal-tenders-count"]');
          expect(tendersCountElement?.textContent).toBe(tenders.length.toString());
          
          cleanup();
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 5: Client Company Name Displays in Page Header
   * 
   * **Validates: Requirement 3.5**
   * 
   * The client's company name should be displayed in the page header correctly.
   */
  it('Property 5: Client company name displays in page header', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }),
        async (companyName) => {
          const { createClient } = await import('@/lib/supabase/server');
          const { getSubscriptionStatus } = await import('@/lib/subscription');

          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'agency-user-123', email: 'agency@example.com' } },
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'agency_clients') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'client-1',
                      company_id: 'company-1',
                      companies: {
                        id: 'company-1',
                        name: companyName,
                      },
                    },
                  }),
                };
              }
              if (table === 'bids') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({ data: [] }),
                };
              }
              if (table === 'tenders') {
                return {
                  select: vi.fn().mockReturnThis(),
                  order: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({ data: [] }),
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
          vi.mocked(getSubscriptionStatus).mockResolvedValue({
            plan: { id: 'agency' },
          } as any);

          const result = await AgencyClientBidsPage({ params: Promise.resolve({ id: 'client-1' }) });
          const { container } = render(result);

          // Property: For ANY company name, it should be displayed in the page
          expect(container.textContent).toContain(companyName);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 6: Navigation to Bid Detail Pages Works
   * 
   * **Validates: Requirement 3.3**
   * 
   * The getBidHref function should generate correct URLs for bid detail pages.
   */
  it('Property 6: Navigation to bid detail pages works correctly', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getSubscriptionStatus } = await import('@/lib/subscription');

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'agency-user-123', email: 'agency@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'agency_clients') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'client-1',
                company_id: 'company-1',
                companies: {
                  id: 'company-1',
                  name: 'Test Company',
                },
              },
            }),
          };
        }
        if (table === 'bids') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'bid-123',
                  status: 'draft',
                  created_at: '2024-01-01T00:00:00Z',
                  tenders: {
                    id: 'tender-1',
                    title: 'Test Tender',
                    contracting_authority: 'Test Authority',
                    deadline: '2024-12-31',
                  },
                },
              ],
            }),
          };
        }
        if (table === 'tenders') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [] }),
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
    vi.mocked(getSubscriptionStatus).mockResolvedValue({
      plan: { id: 'agency' },
    } as any);

    const result = await AgencyClientBidsPage({ params: Promise.resolve({ id: 'client-1' }) });
    render(result);

    // Verify the link is generated correctly
    const linkElement = screen.getByTestId('bid-bid-123-link');
    expect(linkElement.getAttribute('href')).toBe('/dashboard/agency/clients/client-1/bids/bid-123');
  });

  /**
   * Property 7: Multiple Valid Bids Display Correctly
   * 
   * **Validates: Requirements 3.1, 3.4**
   * 
   * For any number of valid bids with complete tender data, all should display correctly.
   */
  it('Property 7: Multiple valid bids display correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            status: fc.constantFrom('draft', 'in_review', 'submitted', 'won', 'lost') as fc.Arbitrary<BidStatus>,
            title: fc.string({ minLength: 5, maxLength: 100 }),
            authority: fc.string({ minLength: 5, maxLength: 50 }),
            deadline: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (bids) => {
          const { createClient } = await import('@/lib/supabase/server');
          const { getSubscriptionStatus } = await import('@/lib/subscription');

          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'agency-user-123', email: 'agency@example.com' } },
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'agency_clients') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'client-1',
                      company_id: 'company-1',
                      companies: {
                        id: 'company-1',
                        name: 'Test Company',
                      },
                    },
                  }),
                };
              }
              if (table === 'bids') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: bids.map((bid) => ({
                      id: bid.id,
                      status: bid.status,
                      created_at: '2024-01-01T00:00:00Z',
                      tenders: {
                        id: `tender-${bid.id}`,
                        title: bid.title,
                        contracting_authority: bid.authority,
                        deadline: bid.deadline.toISOString(),
                      },
                    })),
                  }),
                };
              }
              if (table === 'tenders') {
                return {
                  select: vi.fn().mockReturnThis(),
                  order: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({ data: [] }),
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
          vi.mocked(getSubscriptionStatus).mockResolvedValue({
            plan: { id: 'agency' },
          } as any);

          const result = await AgencyClientBidsPage({ params: Promise.resolve({ id: 'client-1' }) });
          const { container } = render(result);

          // Property: For ANY number of valid bids, all should be displayed correctly
          bids.forEach((bid) => {
            const bidElement = container.querySelector(`[data-testid="bid-${bid.id}"]`);
            expect(bidElement).toBeDefined();

            const titleElement = container.querySelector(`[data-testid="bid-${bid.id}-title"]`);
            expect(titleElement?.textContent).toBe(bid.title);

            const authorityElement = container.querySelector(`[data-testid="bid-${bid.id}-authority"]`);
            expect(authorityElement?.textContent).toBe(bid.authority);

            const statusElement = container.querySelector(`[data-testid="bid-${bid.id}-status"]`);
            expect(statusElement?.textContent).toBe(bid.status);
          });
          
          cleanup();
        }
      ),
      { numRuns: 10 }
    );
  });
});

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✓ Property 1: Valid bids with complete tender data display correctly
 * ✓ Property 2: Tender details (title, authority, deadline) display correctly
 * ✓ Property 3: Bid status badges display correctly for all statuses
 * ✓ Property 4: NewBidModal displays available tenders correctly
 * ✓ Property 5: Client company name displays in page header
 * ✓ Property 6: Navigation to bid detail pages works correctly
 * ✓ Property 7: Multiple valid bids display correctly
 * 
 * All tests should PASS on unfixed code, confirming the baseline behavior.
 * After implementing the fix, these tests should STILL PASS, confirming no regressions.
 */
