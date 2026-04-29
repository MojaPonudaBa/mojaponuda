/**
 * Bug Condition Exploration Test - PDF Viewer Layout and Scroll Fix
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * 
 * This test MUST FAIL on unfixed code to confirm the bugs exist.
 * 
 * Bug Condition 1: Inline viewer layout problem (displays below instead of beside)
 * Bug Condition 2: Documents panel remains visible when inline viewer is open
 * Bug Condition 3: Full viewer renders only first page instead of all pages
 * Bug Condition 4: Scroll events in full viewer scroll background instead of PDF
 * 
 * EXPECTED OUTCOME: Test FAILS (this proves the bugs exist)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { TenderDocFullViewer } from '@/components/bids/workspace/tender-doc-full-viewer';
import type { BidChecklistItem } from '@/types/database';
import * as fs from 'fs';
import * as path from 'path';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess }: any) => {
    // Simulate successful PDF load
    if (onLoadSuccess) {
      setTimeout(() => onLoadSuccess({ numPages: 5 }), 0);
    }
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }: any) => (
    <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>
  ),
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '4.10.38',
  },
}));

describe('Bug Condition Exploration - PDF Viewer Layout and Scroll Issues', () => {
  const mockChecklistItems: BidChecklistItem[] = [
    {
      id: '1',
      bid_id: 'test-bid-123',
      title: 'Test Item 1',
      description: null,
      status: 'missing',
      document_id: null,
      document_type: null,
      risk_note: null,
      page_number: 1,
      page_reference: 'Section 1.1',
      source_text: null,
      sort_order: 0,
      source_highlight_regions: null,
      source_page: null,
      source_quote: null,
      tender_source_document_id: null,
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    // Reset body overflow before each test
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up
    document.body.style.overflow = '';
  });

  /**
   * Property 1: Inline Viewer Layout Problem
   * 
   * Test that the BidWorkspaceLayout component has proper grid structure
   * for displaying viewer beside checklist, not below it.
   * 
   * This test encodes the EXPECTED behavior (viewer SHOULD be in grid layout),
   * so it will FAIL on unfixed code (confirming the bug exists).
   */
  it('Bug Condition 1: Inline viewer should display beside checklist in grid layout (EXPECTED TO FAIL)', () => {
    // Read the BidWorkspaceLayout component source
    const componentPath = path.join(process.cwd(), 'components', 'bids', 'workspace', 'bid-workspace-client.tsx');
    const componentContent = fs.readFileSync(componentPath, 'utf-8');

    // Check 1: Grid layout should exist with lg:grid-cols-5
    const hasGridLayout = componentContent.includes('lg:grid-cols-5');
    expect(hasGridLayout).toBe(true);

    // Check 2: Left column should have lg:col-span-3 for checklist
    const hasLeftColumn = componentContent.includes('lg:col-span-3');
    expect(hasLeftColumn).toBe(true);

    // Check 3: Right column should have lg:col-span-2 for viewer/documents
    const hasRightColumn = componentContent.includes('lg:col-span-2');
    expect(hasRightColumn).toBe(true);

    // Check 4: Conditional rendering should properly switch between viewer and documents panel
    const hasConditionalRendering = componentContent.includes('viewerOpen && canView') &&
                                     componentContent.includes('TenderDocViewer') &&
                                     componentContent.includes('documentsPanel');
    expect(hasConditionalRendering).toBe(true);

    // Check 5: The viewer should be inside the right column div (lg:col-span-2)
    // This is the key check - if viewer is rendered outside the grid, this will fail
    const gridStructureRegex = /<div className="lg:col-span-2">[\s\S]*?{viewerOpen[\s\S]*?TenderDocViewer[\s\S]*?documentsPanel[\s\S]*?<\/div>/;
    const hasProperStructure = gridStructureRegex.test(componentContent);
    expect(hasProperStructure).toBe(true); // WILL FAIL if structure is incorrect

    // Document counterexample
    if (!hasProperStructure) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 1: Inline viewer layout problem');
      console.log('- Has grid layout (lg:grid-cols-5):', hasGridLayout);
      console.log('- Has left column (lg:col-span-3):', hasLeftColumn);
      console.log('- Has right column (lg:col-span-2):', hasRightColumn);
      console.log('- Has conditional rendering:', hasConditionalRendering);
      console.log('- Viewer properly nested in right column:', hasProperStructure);
      console.log('- ISSUE: Grid structure may be incorrect, causing viewer to display below');
      console.log('============================\n');
    }
  });

  /**
   * Property 2: Documents Panel Visibility
   * 
   * Test that when inline viewer is opened, the Documents panel should be hidden
   * and replaced by the PDF viewer through conditional rendering.
   * 
   * This test encodes the EXPECTED behavior (Documents panel SHOULD be hidden),
   * so it will FAIL on unfixed code (confirming the bug exists).
   */
  it('Bug Condition 2: Documents panel should be hidden when inline viewer is open (EXPECTED TO FAIL)', () => {
    // Read the BidWorkspaceLayout component source
    const componentPath = path.join(process.cwd(), 'components', 'bids', 'workspace', 'bid-workspace-client.tsx');
    const componentContent = fs.readFileSync(componentPath, 'utf-8');

    // Check 1: Conditional rendering should use ternary operator (? :) to switch between viewer and panel
    const hasTernaryOperator = componentContent.includes('viewerOpen && canView ? ') &&
                                componentContent.includes(': documentsPanel');
    expect(hasTernaryOperator).toBe(true);

    // Check 2: Only ONE of TenderDocViewer OR documentsPanel should be rendered at a time
    // The pattern should be: {condition ? <TenderDocViewer /> : documentsPanel}
    const exclusiveRenderingPattern = /\{viewerOpen\s*&&\s*canView\s*\?\s*[\s\S]*?TenderDocViewer[\s\S]*?:\s*documentsPanel\s*\}/;
    const hasExclusiveRendering = exclusiveRenderingPattern.test(componentContent);
    expect(hasExclusiveRendering).toBe(true); // WILL FAIL if both can be visible

    // Check 3: There should NOT be separate rendering of both viewer AND documents panel
    // Count occurrences of documentsPanel in the right column
    const rightColumnMatch = componentContent.match(/<div className="lg:col-span-2">([\s\S]*?)<\/div>/);
    const rightColumnContent = rightColumnMatch ? rightColumnMatch[1] : '';
    const documentsPanelCount = (rightColumnContent.match(/documentsPanel/g) || []).length;
    
    // Should only appear once (in the ternary operator)
    expect(documentsPanelCount).toBe(1); // WILL FAIL if rendered multiple times

    // Document counterexample
    if (!hasExclusiveRendering || documentsPanelCount !== 1) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 2: Documents panel visibility issue');
      console.log('- Has ternary operator for conditional rendering:', hasTernaryOperator);
      console.log('- Has exclusive rendering pattern:', hasExclusiveRendering);
      console.log('- documentsPanel occurrences in right column:', documentsPanelCount);
      console.log('- ISSUE: Documents panel may be visible when viewer is open');
      console.log('============================\n');
    }
  });

  /**
   * Property 3: Full Viewer Single Page Rendering
   * 
   * Test that when full viewer is opened, ALL pages of the PDF should be rendered,
   * not just the first page.
   * 
   * This test encodes the EXPECTED behavior (ALL pages SHOULD be rendered),
   * so it will FAIL on unfixed code (confirming the bug exists).
   */
  it('Bug Condition 3: Full viewer should render all PDF pages, not just first page (EXPECTED TO FAIL)', async () => {
    const { container } = render(
      <TenderDocFullViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        checklistItems={mockChecklistItems}
        onClose={() => {}}
      />
    );

    // Wait for PDF to load (mocked to have 5 pages)
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    }, { timeout: 1000 });

    // Check 1: PDF document should be rendered
    const pdfDocument = container.querySelector('[data-testid="pdf-document"]');
    expect(pdfDocument).toBeTruthy();

    // Check 2: ALL pages should be rendered (not just page 1)
    // The bug causes only <Page pageNumber={pageNumber} /> to render (single page)
    // The fix should render multiple <Page> components for all pages
    
    const page1 = container.querySelector('[data-testid="pdf-page-1"]');
    const page2 = container.querySelector('[data-testid="pdf-page-2"]');
    const page3 = container.querySelector('[data-testid="pdf-page-3"]');
    const page4 = container.querySelector('[data-testid="pdf-page-4"]');
    const page5 = container.querySelector('[data-testid="pdf-page-5"]');

    // At least page 1 should exist
    expect(page1).toBeTruthy();

    // ALL pages should be rendered (this will FAIL on unfixed code)
    const allPagesRendered = page1 && page2 && page3 && page4 && page5;
    expect(allPagesRendered).toBe(true); // WILL FAIL - only page 1 is rendered

    // Document counterexample
    if (!allPagesRendered) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 3: Full viewer single page rendering');
      console.log('- PDF document rendered:', !!pdfDocument);
      console.log('- Page 1 rendered:', !!page1);
      console.log('- Page 2 rendered:', !!page2);
      console.log('- Page 3 rendered:', !!page3);
      console.log('- Page 4 rendered:', !!page4);
      console.log('- Page 5 rendered:', !!page5);
      console.log('- All pages rendered:', allPagesRendered);
      console.log('- ISSUE: Only first page is rendered, not all pages');
      console.log('============================\n');
    }
  });

  /**
   * Property 4: Scroll Isolation in Full Viewer
   * 
   * Test that when full viewer is opened, scrolling should be isolated to the PDF
   * container, and the background page should not scroll.
   * 
   * This test encodes the EXPECTED behavior (background SHOULD NOT scroll),
   * so it will FAIL on unfixed code (confirming the bug exists).
   */
  it('Bug Condition 4: Full viewer should prevent background scroll (EXPECTED TO FAIL)', async () => {
    // Initial state: body should be scrollable
    expect(document.body.style.overflow).toBe('');

    const { container } = render(
      <TenderDocFullViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        checklistItems={mockChecklistItems}
        onClose={() => {}}
      />
    );

    // Wait for component to mount and useEffect to run
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Check 1: Body overflow should be set to "hidden" to prevent background scroll
    // This is the key assertion that will FAIL if scroll isolation doesn't work
    expect(document.body.style.overflow).toBe('hidden'); // WILL FAIL if not set properly

    // Check 2: PDF container should have overflow-auto for scrolling
    const pdfContainer = container.querySelector('.overflow-auto');
    expect(pdfContainer).toBeTruthy(); // WILL FAIL if container doesn't have overflow-auto

    // Check 3: Full viewer should be in a fixed position overlay
    const fullViewerOverlay = container.querySelector('.fixed.inset-0');
    expect(fullViewerOverlay).toBeTruthy();

    // Document counterexample
    const bodyOverflowHidden = document.body.style.overflow === 'hidden';
    const hasPdfScrollContainer = !!pdfContainer;
    const hasFixedOverlay = !!fullViewerOverlay;

    if (!bodyOverflowHidden || !hasPdfScrollContainer) {
      console.log('\n=== COUNTEREXAMPLE FOUND ===');
      console.log('Bug Condition 4: Scroll isolation issue');
      console.log('- Body overflow hidden:', bodyOverflowHidden);
      console.log('- PDF container has overflow-auto:', hasPdfScrollContainer);
      console.log('- Full viewer has fixed overlay:', hasFixedOverlay);
      console.log('- ISSUE: Background scroll is not properly prevented');
      console.log('============================\n');
    }
  });

  /**
   * Property 5: Property-Based Test - Multiple PDF Scenarios
   * 
   * Generate various PDF scenarios (different page counts) and verify that
   * the full viewer should render all pages for any PDF.
   */
  it('Property: Full viewer should render all pages for any PDF document (EXPECTED TO FAIL)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          numPages: fc.integer({ min: 1, max: 20 }),
          fileName: fc.string({ minLength: 5, maxLength: 30 }),
        }),
        async (scenario) => {
          // Mock PDF with variable page count
          vi.doMock('react-pdf', () => ({
            Document: ({ children, onLoadSuccess }: any) => {
              if (onLoadSuccess) {
                setTimeout(() => onLoadSuccess({ numPages: scenario.numPages }), 0);
              }
              return <div data-testid="pdf-document">{children}</div>;
            },
            Page: ({ pageNumber }: any) => (
              <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>
            ),
            pdfjs: {
              GlobalWorkerOptions: { workerSrc: '' },
              version: '4.10.38',
            },
          }));

          const { container } = render(
            <TenderDocFullViewer
              fileUrl="/test-file.pdf"
              fileName={scenario.fileName}
              checklistItems={mockChecklistItems}
              onClose={() => {}}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
          });

          // Property: For ANY PDF with N pages, ALL N pages should be rendered
          const renderedPages = container.querySelectorAll('[data-testid^="pdf-page-"]');
          const allPagesRendered = renderedPages.length === scenario.numPages;

          expect(allPagesRendered).toBe(true); // WILL FAIL - only 1 page rendered

          // Document the failing scenario
          if (!allPagesRendered) {
            console.log('\n=== PROPERTY VIOLATION ===');
            console.log('Scenario:', scenario);
            console.log('Expected pages:', scenario.numPages);
            console.log('Rendered pages:', renderedPages.length);
            console.log('All pages rendered:', allPagesRendered);
            console.log('=========================\n');
          }
        }
      ),
      { numRuns: 5 } // Run 5 different PDF scenarios
    );
  });

  /**
   * Property 6: Property-Based Test - Scroll Isolation Scenarios
   * 
   * Generate various scroll scenarios and verify that background scroll
   * is always prevented when full viewer is open.
   */
  it('Property: Background scroll should be prevented for any full viewer state (EXPECTED TO FAIL)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          hasChecklistItems: fc.boolean(),
          numPages: fc.integer({ min: 1, max: 10 }),
          initialPage: fc.integer({ min: 1, max: 10 }),
        }),
        async (scenario) => {
          const checklistItems = scenario.hasChecklistItems ? mockChecklistItems : [];

          const { container } = render(
            <TenderDocFullViewer
              fileUrl="/test-file.pdf"
              fileName="test.pdf"
              checklistItems={checklistItems}
              onClose={() => {}}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
          });

          // Property: Regardless of checklist items, page count, or initial page,
          // body overflow should ALWAYS be "hidden" when full viewer is open
          const bodyOverflowHidden = document.body.style.overflow === 'hidden';

          expect(bodyOverflowHidden).toBe(true); // WILL FAIL if not properly set

          // Document the failing scenario
          if (!bodyOverflowHidden) {
            console.log('\n=== PROPERTY VIOLATION ===');
            console.log('Scenario:', scenario);
            console.log('Expected: body overflow hidden');
            console.log('Actual: body overflow =', document.body.style.overflow);
            console.log('=========================\n');
          }

          // Clean up for next iteration
          document.body.style.overflow = '';
        }
      ),
      { numRuns: 5 } // Run 5 different scenarios
    );
  });
});

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✗ Bug Condition 1: Inline viewer should display beside checklist in grid layout (EXPECTED TO FAIL)
 *   - Counterexample: Viewer is NOT properly positioned in grid layout
 *   - Issue: Viewer displays below checklist instead of beside it
 * 
 * ✗ Bug Condition 2: Documents panel should be hidden when inline viewer is open (EXPECTED TO FAIL)
 *   - Counterexample: Both Documents panel and viewer might be visible simultaneously
 *   - Issue: Conditional rendering doesn't properly hide Documents panel
 * 
 * ✗ Bug Condition 3: Full viewer should render all PDF pages, not just first page (EXPECTED TO FAIL)
 *   - Counterexample: Only first page is rendered, not all pages
 *   - Issue: Single <Page> component instead of multiple <Page> components
 * 
 * ✗ Bug Condition 4: Full viewer should prevent background scroll (EXPECTED TO FAIL)
 *   - Counterexample: Background scroll is not properly prevented
 *   - Issue: body overflow not set to "hidden" or PDF container doesn't have overflow-auto
 * 
 * ✗ Property: Full viewer should render all pages for any PDF document (EXPECTED TO FAIL)
 *   - Multiple counterexamples across different PDF page counts
 * 
 * ✗ Property: Background scroll should be prevented for any full viewer state (EXPECTED TO FAIL)
 *   - Multiple counterexamples across different viewer states
 * 
 * These failures CONFIRM the bugs exist and provide concrete counterexamples.
 */
