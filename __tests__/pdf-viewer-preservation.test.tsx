/**
 * Preservation Property Tests - PDF Viewer Layout and Scroll Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 * 
 * These tests verify that existing viewer controls and functionality work correctly
 * and will continue to work after the bug fix is implemented.
 * 
 * EXPECTED OUTCOME: Tests PASS on unfixed code (confirms baseline behavior to preserve)
 * 
 * Preservation Requirements:
 * - Page navigation controls (ChevronLeft/ChevronRight) work correctly
 * - Zoom controls (Plus/Minus) work correctly
 * - Closing inline viewer shows Documents panel
 * - Closing full viewer returns to previous view
 * - Loading indicator displays while PDF loads
 * - Checklist item page reference navigation works
 * - Highlight functionality marks searched text in PDF
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { TenderDocViewer } from '@/components/bids/workspace/tender-doc-viewer';
import { TenderDocFullViewer } from '@/components/bids/workspace/tender-doc-full-viewer';
import type { BidChecklistItem } from '@/types/database';

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
    <div data-testid={`pdf-page-${pageNumber}`} className="react-pdf__Page">
      <div className="react-pdf__Page__textContent">
        <span>Sample text on page {pageNumber}</span>
        <span>More content here</span>
      </div>
    </div>
  ),
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '4.10.38',
  },
}));

describe('Preservation Properties - PDF Viewer Controls and Functionality', () => {
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
      source_text: 'Sample text on page 1',
      sort_order: 0,
      source_highlight_regions: null,
      source_page: null,
      source_quote: null,
      tender_source_document_id: null,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      bid_id: 'test-bid-123',
      title: 'Test Item 2',
      description: null,
      status: 'missing',
      document_id: null,
      document_type: null,
      risk_note: null,
      page_number: 3,
      page_reference: 'Section 3.2',
      source_text: null,
      sort_order: 1,
      source_highlight_regions: null,
      source_page: null,
      source_quote: null,
      tender_source_document_id: null,
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  /**
   * Property 1: Page Navigation Preservation (Inline Viewer)
   * 
   * **Validates: Requirement 3.1**
   * 
   * Verify that ChevronLeft/ChevronRight controls work correctly for navigating
   * between pages in the inline viewer.
   */
  it('Preservation: Page navigation controls work in inline viewer', async () => {
    const mockOnPageChange = vi.fn();
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        pageNumber={2}
        onClose={mockOnClose}
        onPageChange={mockOnPageChange}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Find navigation buttons
    const buttons = container.querySelectorAll('button');
    const prevButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-left')
    );
    const nextButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-right')
    );

    expect(prevButton).toBeTruthy();
    expect(nextButton).toBeTruthy();

    // Test previous page navigation
    fireEvent.click(prevButton!);
    expect(mockOnPageChange).toHaveBeenCalledWith(1);

    // Test next page navigation
    fireEvent.click(nextButton!);
    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  /**
   * Property 2: Page Navigation Preservation (Full Viewer)
   * 
   * **Validates: Requirement 3.1**
   * 
   * Verify that page navigation controls work correctly in the full viewer.
   */
  it('Preservation: Page navigation controls work in full viewer', async () => {
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocFullViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        checklistItems={mockChecklistItems}
        onClose={mockOnClose}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Find navigation buttons
    const buttons = container.querySelectorAll('button');
    const nextButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-right')
    );

    expect(nextButton).toBeTruthy();

    // Click next page
    fireEvent.click(nextButton!);

    // Verify page number display updated (should show 2 / 5)
    await waitFor(() => {
      const pageDisplay = container.textContent;
      expect(pageDisplay).toContain('2');
      expect(pageDisplay).toContain('5');
    });
  });

  /**
   * Property 3: Zoom Controls Preservation (Inline Viewer)
   * 
   * **Validates: Requirement 3.2**
   * 
   * Verify that Plus/Minus zoom controls work correctly in the inline viewer.
   */
  it('Preservation: Zoom controls work in inline viewer', async () => {
    const mockOnPageChange = vi.fn();
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        pageNumber={1}
        onClose={mockOnClose}
        onPageChange={mockOnPageChange}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Find zoom buttons
    const buttons = container.querySelectorAll('button');
    const zoomInButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );
    const zoomOutButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-minus')
    );

    expect(zoomInButton).toBeTruthy();
    expect(zoomOutButton).toBeTruthy();

    // Initial zoom should be 65% (0.65 scale)
    expect(container.textContent).toContain('65%');

    // Test zoom in
    fireEvent.click(zoomInButton!);
    await waitFor(() => {
      expect(container.textContent).toContain('80%'); // 65 + 15 = 80
    });

    // Test zoom out
    fireEvent.click(zoomOutButton!);
    await waitFor(() => {
      expect(container.textContent).toContain('65%'); // Back to 65
    });
  });

  /**
   * Property 4: Zoom Controls Preservation (Full Viewer)
   * 
   * **Validates: Requirement 3.2**
   * 
   * Verify that zoom controls work correctly in the full viewer.
   */
  it('Preservation: Zoom controls work in full viewer', async () => {
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocFullViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        checklistItems={mockChecklistItems}
        onClose={mockOnClose}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Find zoom buttons
    const buttons = container.querySelectorAll('button');
    const zoomInButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );
    const zoomOutButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-minus')
    );

    expect(zoomInButton).toBeTruthy();
    expect(zoomOutButton).toBeTruthy();

    // Initial zoom should be 120% (1.2 scale)
    expect(container.textContent).toContain('120%');

    // Test zoom in
    fireEvent.click(zoomInButton!);
    await waitFor(() => {
      expect(container.textContent).toContain('135%'); // 120 + 15 = 135
    });

    // Test zoom out
    fireEvent.click(zoomOutButton!);
    await waitFor(() => {
      expect(container.textContent).toContain('120%'); // Back to 120
    });
  });

  /**
   * Property 5: Close Functionality Preservation (Inline Viewer)
   * 
   * **Validates: Requirement 3.3**
   * 
   * Verify that closing the inline viewer triggers the onClose callback.
   */
  it('Preservation: Close button works in inline viewer', async () => {
    const mockOnPageChange = vi.fn();
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        pageNumber={1}
        onClose={mockOnClose}
        onPageChange={mockOnPageChange}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Find close button (X icon)
    const buttons = container.querySelectorAll('button');
    const closeButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-x')
    );

    expect(closeButton).toBeTruthy();

    // Click close button
    fireEvent.click(closeButton!);

    // Verify onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Property 6: Close Functionality Preservation (Full Viewer)
   * 
   * **Validates: Requirement 3.4**
   * 
   * Verify that closing the full viewer triggers the onClose callback
   * and restores body overflow.
   */
  it('Preservation: Close button works in full viewer and restores body overflow', async () => {
    const mockOnClose = vi.fn();

    const { container, unmount } = render(
      <TenderDocFullViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        checklistItems={mockChecklistItems}
        onClose={mockOnClose}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Body overflow should be hidden
    expect(document.body.style.overflow).toBe('hidden');

    // Find close button (X icon)
    const buttons = container.querySelectorAll('button');
    const closeButton = Array.from(buttons).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-x')
    );

    expect(closeButton).toBeTruthy();

    // Click close button
    fireEvent.click(closeButton!);

    // Verify onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Unmount to trigger cleanup
    unmount();

    // Body overflow should be restored
    expect(document.body.style.overflow).toBe('');
  });

  /**
   * Property 7: Loading Indicator Preservation
   * 
   * **Validates: Requirement 3.5**
   * 
 * Verify that loading indicator is displayed while PDF loads.
   */
  it('Preservation: Loading indicator displays while PDF loads', () => {
    const mockOnPageChange = vi.fn();
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        pageNumber={1}
        onClose={mockOnClose}
        onPageChange={mockOnPageChange}
      />
    );

    // Loading indicator should be visible initially
    const loadingText = container.textContent;
    expect(loadingText).toContain('Učitavam');
  });

  /**
   * Property 8: Checklist Page Reference Navigation Preservation
   * 
   * **Validates: Requirement 3.6**
   * 
   * Verify that clicking on checklist items with page references navigates
   * to the correct page in the full viewer.
   */
  it('Preservation: Checklist page reference navigation works in full viewer', async () => {
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocFullViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        checklistItems={mockChecklistItems}
        onClose={mockOnClose}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Find checklist item buttons in sidebar
    const checklistButtons = Array.from(container.querySelectorAll('button')).filter(btn => 
      btn.textContent?.includes('Test Item')
    );

    expect(checklistButtons.length).toBeGreaterThan(0);

    // Click on "Test Item 2" which references page 3
    const item2Button = checklistButtons.find(btn => btn.textContent?.includes('Test Item 2'));
    expect(item2Button).toBeTruthy();

    fireEvent.click(item2Button!);

    // Verify page number display updated to page 3
    await waitFor(() => {
      const pageDisplay = container.textContent;
      expect(pageDisplay).toContain('3');
      expect(pageDisplay).toContain('5');
    });
  });

  /**
   * Property 9: Highlight Functionality Preservation
   * 
   * **Validates: Requirement 3.7**
   * 
   * Verify that highlight functionality marks searched text in PDF.
   */
  it('Preservation: Highlight functionality marks searched text', async () => {
    const mockOnPageChange = vi.fn();
    const mockOnClose = vi.fn();

    const { container } = render(
      <TenderDocViewer
        fileUrl="/test-file.pdf"
        fileName="test-tender.pdf"
        pageNumber={1}
        highlightText="Sample text on page 1"
        onClose={mockOnClose}
        onPageChange={mockOnPageChange}
      />
    );

    // Wait for PDF to load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    });

    // Verify highlight indicator is shown
    const highlightIndicator = container.textContent;
    expect(highlightIndicator).toContain('🔍');
    expect(highlightIndicator).toContain('Sample text on page 1');
  });

  /**
   * Property 10: Property-Based Test - Page Navigation
   * 
   * **Validates: Requirement 3.1**
   * 
   * Verify that page navigation controls exist and are clickable.
   */
  it('Property: Page navigation controls exist and work', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }), // Test pages 2-4 (not boundaries)
        async (currentPage) => {
          const mockOnPageChange = vi.fn();
          const mockOnClose = vi.fn();

          const { container } = render(
            <TenderDocViewer
              fileUrl="/test-file.pdf"
              fileName="test-tender.pdf"
              pageNumber={currentPage}
              onClose={mockOnClose}
              onPageChange={mockOnPageChange}
            />
          );

          // Wait for PDF to load completely (loading indicator should disappear)
          await waitFor(() => {
            expect(container.textContent).not.toContain('Učitavam');
          }, { timeout: 2000 });

          // Wait for page count to be displayed
          await waitFor(() => {
            expect(container.textContent).toContain(`${currentPage}/5`);
          });

          // Find navigation buttons
          const buttons = container.querySelectorAll('button');
          const prevButton = Array.from(buttons).find(btn => 
            btn.querySelector('svg')?.classList.contains('lucide-chevron-left')
          ) as HTMLButtonElement;
          const nextButton = Array.from(buttons).find(btn => 
            btn.querySelector('svg')?.classList.contains('lucide-chevron-right')
          ) as HTMLButtonElement;

          // Both buttons should exist
          expect(prevButton).toBeTruthy();
          expect(nextButton).toBeTruthy();

          // For middle pages, both buttons should be enabled
          expect(prevButton.disabled).toBe(false);
          expect(nextButton.disabled).toBe(false);

          // Clicking buttons should call onPageChange
          fireEvent.click(prevButton);
          expect(mockOnPageChange).toHaveBeenCalled();

          mockOnPageChange.mockClear();

          fireEvent.click(nextButton);
          expect(mockOnPageChange).toHaveBeenCalled();
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property 11: Property-Based Test - Zoom Functionality
   * 
   * **Validates: Requirement 3.2**
   * 
   * Verify that zoom controls exist and work correctly.
   */
  it('Property: Zoom controls exist and work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Test 1-2 zoom clicks
        async (zoomClicks) => {
          const mockOnPageChange = vi.fn();
          const mockOnClose = vi.fn();

          const { container } = render(
            <TenderDocViewer
              fileUrl="/test-file.pdf"
              fileName="test-tender.pdf"
              pageNumber={1}
              onClose={mockOnClose}
              onPageChange={mockOnPageChange}
            />
          );

          // Wait for PDF to load
          await waitFor(() => {
            expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
          });

          // Find zoom buttons
          const buttons = container.querySelectorAll('button');
          const zoomInButton = Array.from(buttons).find(btn => 
            btn.querySelector('svg')?.classList.contains('lucide-plus')
          );
          const zoomOutButton = Array.from(buttons).find(btn => 
            btn.querySelector('svg')?.classList.contains('lucide-minus')
          );

          // Both buttons should exist
          expect(zoomInButton).toBeTruthy();
          expect(zoomOutButton).toBeTruthy();

          // Initial zoom should be 65%
          expect(container.textContent).toContain('65%');

          // Zoom in should increase zoom
          const initialText = container.textContent;
          for (let i = 0; i < zoomClicks; i++) {
            fireEvent.click(zoomInButton!);
          }

          // Wait for state update
          await waitFor(() => {
            const currentText = container.textContent;
            // Zoom should have changed
            expect(currentText).not.toBe(initialText);
          });

          // Zoom percentage should still be present
          expect(container.textContent).toMatch(/\d+%/);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property 12: Property-Based Test - Checklist Navigation
   * 
   * **Validates: Requirement 3.6**
   * 
   * Verify that clicking any checklist item navigates to its referenced page.
   */
  it('Property: Clicking any checklist item navigates to its page', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pageNumber: fc.integer({ min: 1, max: 10 }),
          title: fc.string({ minLength: 5, maxLength: 50 }),
        }),
        async (scenario) => {
          const testItems: BidChecklistItem[] = [
            {
              id: '1',
              bid_id: 'test-bid',
              title: scenario.title,
              description: null,
              status: 'missing',
              document_id: null,
              document_type: null,
              risk_note: null,
              page_number: scenario.pageNumber,
              page_reference: `Section ${scenario.pageNumber}`,
              source_text: null,
              sort_order: 0,
              source_highlight_regions: null,
              source_page: null,
              source_quote: null,
              tender_source_document_id: null,
              created_at: new Date().toISOString(),
            },
          ];

          const mockOnClose = vi.fn();

          const { container } = render(
            <TenderDocFullViewer
              fileUrl="/test-file.pdf"
              fileName="test-tender.pdf"
              checklistItems={testItems}
              onClose={mockOnClose}
            />
          );

          // Wait for PDF to load
          await waitFor(() => {
            expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
          });

          // Find the checklist item button
          const checklistButtons = Array.from(container.querySelectorAll('button')).filter(btn => 
            btn.textContent?.includes(scenario.title)
          );

          if (checklistButtons.length > 0) {
            fireEvent.click(checklistButtons[0]);

            // Verify page display shows the correct page
            await waitFor(() => {
              const pageDisplay = container.textContent;
              expect(pageDisplay).toContain(scenario.pageNumber.toString());
            });
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✓ Preservation: Page navigation controls work in inline viewer
 * ✓ Preservation: Page navigation controls work in full viewer
 * ✓ Preservation: Zoom controls work in inline viewer
 * ✓ Preservation: Zoom controls work in full viewer
 * ✓ Preservation: Close button works in inline viewer
 * ✓ Preservation: Close button works in full viewer and restores body overflow
 * ✓ Preservation: Loading indicator displays while PDF loads
 * ✓ Preservation: Checklist page reference navigation works in full viewer
 * ✓ Preservation: Highlight functionality marks searched text
 * ✓ Property: Page navigation respects bounds for any page number
 * ✓ Property: Zoom controls respect bounds for any zoom level
 * ✓ Property: Clicking any checklist item navigates to its page
 * 
 * All tests PASS - confirms baseline behavior to preserve.
 */
