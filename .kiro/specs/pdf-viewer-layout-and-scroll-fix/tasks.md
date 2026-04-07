# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - PDF Viewer Layout, Visibility, Rendering, and Scroll Issues
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the four bug scenarios exist
  - **Scoped PBT Approach**: Test concrete failing cases for each of the four bug scenarios
  - Test Scenario 1: Inline viewer opens below checklist instead of beside it (layout problem)
  - Test Scenario 2: Documents panel remains visible when inline viewer is open
  - Test Scenario 3: Full viewer renders only first page instead of all pages
  - Test Scenario 4: Scroll events in full viewer scroll background page instead of PDF
  - The test assertions should match the Expected Behavior Properties from design
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Viewer Controls and Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test page navigation controls (ChevronLeft/ChevronRight) work correctly
  - Test zoom controls (Plus/Minus) work correctly
  - Test closing inline viewer shows Documents panel
  - Test closing full viewer returns to previous view
  - Test loading indicator displays while PDF loads
  - Test checklist item page reference navigation works
  - Test highlight functionality marks searched text in PDF
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for PDF viewer layout, visibility, rendering, and scroll issues

  - [x] 3.1 Fix inline viewer grid layout and Documents panel visibility
    - Verify grid layout in `BidWorkspaceLayout` properly displays viewer in right column (lg:col-span-2)
    - Ensure conditional rendering `{viewerOpen && canView ? <TenderDocViewer /> : documentsPanel}` works correctly
    - Check for CSS conflicts that might cause viewer to display below instead of beside
    - Verify `viewerOpen` state properly controls viewer display and Documents panel hiding
    - Ensure `setViewerOpen(true)` properly triggers re-render
    - Check for race conditions or timing issues in state management
    - _Bug_Condition: (input.action == "openInlineViewer" AND layoutIsIncorrect()) OR (input.action == "openInlineViewer" AND documentsPanelIsVisible())_
    - _Expected_Behavior: Inline viewer displayed in right grid column beside checklist, Documents panel hidden_
    - _Preservation: Page navigation, zoom controls, close functionality, loading indicator, checklist page references, highlight functionality_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Fix full viewer page rendering and scroll isolation
    - Replace single `<Page>` component with multiple `<Page>` components for all PDF pages
    - Use `Array.from({ length: numPages }, (_, i) => i + 1).map(page => <Page key={page} pageNumber={page} />)`
    - Remove or adapt `pageNumber` state for quick navigation instead of page switching
    - Ensure all pages are rendered in scrollable container
    - Verify `document.body.style.overflow = "hidden"` works correctly
    - Add `overflow-auto` on PDF container div
    - Ensure scroll events don't propagate to parent elements
    - Update page navigation controls to use `scrollIntoView` or `scrollTo` if kept
    - Add refs to each `<Page>` component for scroll targeting
    - Consider adjusting default scale from 1.2 to 1.0 or 0.9 for better multi-page view
    - _Bug_Condition: (input.action == "openFullViewer" AND onlyFirstPageRendered()) OR (input.action == "scrollInFullViewer" AND backgroundScrolls())_
    - _Expected_Behavior: All PDF pages rendered and scrollable, background page scroll prevented_
    - _Preservation: Page navigation, zoom controls, close functionality, loading indicator, checklist page references, highlight functionality_
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - PDF Viewer Layout, Visibility, Rendering, and Scroll Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Viewer Controls and Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
